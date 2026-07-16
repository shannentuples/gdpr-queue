import { Router } from "express";
import { z } from "zod";
import { applyClassification, createRequest, getRequest, listRequests, updateStatus } from "../db/requestsRepo.js";
import { confirmMatch, listRequestMatches } from "../db/foundRecordsRepo.js";
import { calculateDeadline } from "../utils/deadlines.js";
import { classifyRequest, resolveClassificationOutcome } from "../services/classification.js";
import { searchDataSources } from "../services/search.js";

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

requestsRouter.get("/:id", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  const foundRecords = listRequestMatches(req.params.id);
  res.json({ request, foundRecords });
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
