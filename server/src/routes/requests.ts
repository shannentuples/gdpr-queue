import { Router } from "express";
import { z } from "zod";
import { createRequest, getRequest, listRequests } from "../db/requestsRepo.js";
import { calculateDeadline } from "../utils/deadlines.js";

export const requestsRouter = Router();

const intakeSchema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email(),
  description: z.string().min(1).max(5000),
});

// Sprint 2: create + store a request. No AI classification yet (Sprint 3) —
// status starts at 'new' and stays there.
requestsRouter.post("/", (req, res) => {
  const parsed = intakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const receivedAt = new Date();
  const deadlineAt = calculateDeadline(receivedAt);
  const request = createRequest({ ...parsed.data, receivedAt, deadlineAt });
  res.status(201).json(request);
});

requestsRouter.get("/", (_req, res) => {
  res.json(listRequests());
});

requestsRouter.get("/:id", (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  res.json(request);
});
