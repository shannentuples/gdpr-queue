import "dotenv/config";
import express from "express";
import cors from "cors";
import { requestsRouter } from "./routes/requests.js";
import "./db/index.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/requests", requestsRouter);

app.listen(port, () => {
  console.log(`DSAR server listening on http://localhost:${port}`);
});
