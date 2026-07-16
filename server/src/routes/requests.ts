import { Router } from "express";
import { z } from "zod";
import { applyClassification, createRequest, getRequest, listRequests } from "../db/requestsRepo.js";
import { calculateDeadline } from "../utils/deadlines.js";
import { classifyRequest, resolveClassificationOutcome } from "../services/classification.js";

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
  res.json(request);
});
