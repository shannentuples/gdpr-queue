import { Router } from "express";
import { z } from "zod";
import {
  applyClassification,
  createRequest,
  getRequest,
  listRequests,
  setRequestType,
  updateStatus,
} from "../db/requestsRepo.js";
import { confirmMatch, listRequestMatches } from "../db/foundRecordsRepo.js";
import { getDraft, saveDraft, updateDraftContent } from "../db/responseLettersRepo.js";
import { listEvents, logEvent } from "../db/auditLogRepo.js";
import { calculateDeadline } from "../utils/deadlines.js";
import { classifyRequest, resolveClassificationOutcome } from "../services/classification.js";
import { searchDataSources } from "../services/search.js";
import { draftResponseLetter } from "../services/letterDraft.js";
import { REQUEST_TYPES } from "../types/dsar.js";

export const requestsRouter = Router();

const intakeSchema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email(),
  description: z.string().min(1).max(5000),
});

// Create + store a request, then classify it with Claude. High/medium
// confidence auto-sets request_type and status='classified'; low confidence
// leaves request_type unset and routes to status='needs_review' for a human.
requestsRouter.post("/", async (req, res) => {
  const parsed = intakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const receivedAt = new Date();
  const deadlineAt = calculateDeadline(receivedAt);
  const request = createRequest({ ...parsed.data, receivedAt, deadlineAt });

  try {
    const result = await classifyRequest(parsed.data.description);
    const outcome = resolveClassificationOutcome(result);
    const updated = applyClassification(request.id, {
      requestType: outcome.requestType,
      confidence: result.confidence,
      rationale: result.rationale,
      status: outcome.status,
    });
    const confidencePct = Math.round(result.confidence * 100);
    logEvent(
      request.id,
      "classification",
      outcome.status === "classified"
        ? `Classified as ${outcome.requestType} (${confidencePct}% confidence)`
        : `Low confidence (${confidencePct}%) — flagged for manual review`
    );
    return res.status(201).json(updated);
  } catch (err) {
    // Request is still created even if classification fails — it just stays
    // at status 'new' rather than blocking the requester's confirmation.
    console.error("Classification failed:", err);
    return res.status(201).json(request);
  }
});

requestsRouter.get("/", (_req, res) => {
  res.json(listRequests());
});

const setTypeSchema = z.object({ requestType: z.enum(REQUEST_TYPES) });

// Reviewer sets or overrides the request type (Sprint 7) — covers both the
// needs_review case (AI wasn't confident enough to pick one) and simple
// correction of an AI misclassification. Locked once sent, same as the
// letter, since the type is part of what the sent response was based on.
requestsRouter.put("/:id/type", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status === "sent") {
    return res.status(409).json({ error: "Cannot change the type of a request that has already been sent" });
  }

  const parsed = setTypeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const previous = request.requestType ?? "unset";
  const updated = setRequestType(req.params.id, parsed.data.requestType);
  logEvent(req.params.id, "classification", `Reviewer set type to ${parsed.data.requestType} (was ${previous})`);
  res.json(updated);
});

requestsRouter.get("/:id", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  const foundRecords = listRequestMatches(req.params.id);
  const draftLetter = getDraft(req.params.id) ?? null;
  const auditLog = listEvents(req.params.id);
  res.json({ request, foundRecords, draftLetter, auditLog });
});

// AI tool-calling search across mock data sources (Sprint 5). Persists
// matches with a confidence + reason each; matches at/above the confirm
// threshold are auto-confirmed, the rest need a reviewer's explicit confirm.
requestsRouter.post("/:id/search", async (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });

  updateStatus(req.params.id, "researching");
  try {
    const { matches, summary } = await searchDataSources(request);
    const sourceCount = new Set(matches.map((m) => m.sourceName)).size;
    const confirmedCount = matches.filter((m) => m.confirmed).length;
    logEvent(
      req.params.id,
      "search",
      `Found ${matches.length} record(s) across ${sourceCount} source(s) — ${confirmedCount} auto-confirmed, ${matches.length - confirmedCount} need review`
    );
    res.json({ matches, summary });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(502).json({ error: "Search failed" });
  }
});

// Manually confirm a below-threshold match before it counts as "found" for
// this request (Sprint 5 AC: don't disclose/delete on an unconfirmed guess).
requestsRouter.post("/:id/records/:recordId/confirm", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });

  const confirmed = confirmMatch(req.params.id, req.params.recordId);
  if (!confirmed) return res.status(404).json({ error: "Match not found for this request" });
  res.json(listRequestMatches(req.params.id));
});

// Draft the response letter — only confirmed matches are handed to Claude
// (Sprint 6 AC: draft references only confirmed, non-flagged records).
// Regenerating overwrites any existing draft, including unsaved edits.
requestsRouter.post("/:id/draft", async (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });

  const confirmedRecords = listRequestMatches(req.params.id).filter((r) => r.confirmed);
  try {
    const content = await draftResponseLetter(request, confirmedRecords);
    const letter = saveDraft(req.params.id, content);
    updateStatus(req.params.id, "drafted");
    logEvent(req.params.id, "draft", `AI draft generated referencing ${confirmedRecords.length} confirmed record(s)`);
    res.json(letter);
  } catch (err) {
    console.error("Draft failed:", err);
    res.status(502).json({ error: "Draft generation failed" });
  }
});

const editLetterSchema = z.object({ content: z.string().min(1).max(20000) });

// Reviewer edits the draft before sending (Sprint 6 AC). Blocked once the
// request has been marked sent — the sent letter is the record of what
// actually went out.
requestsRouter.put("/:id/letter", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status === "sent") {
    return res.status(409).json({ error: "Cannot edit a letter that has already been sent" });
  }

  const parsed = editLetterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = updateDraftContent(req.params.id, parsed.data.content);
  if (!updated) return res.status(404).json({ error: "No draft exists for this request yet" });

  logEvent(req.params.id, "edit", "Reviewer edited the draft letter");
  res.json(updated);
});

// Mark as sent — terminal in this demo (no real email dispatch, see README).
requestsRouter.post("/:id/send", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (!getDraft(req.params.id)) return res.status(409).json({ error: "No draft exists to send" });

  const updated = updateStatus(req.params.id, "sent");
  logEvent(req.params.id, "send", "Marked as sent");
  res.json(updated);
});
