import express from "express";
import cors from "cors";
import { pool } from "./db";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "SADA backend" });
});
app.get("/api/db-health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now, current_database() as db");
    res.json({ ok: true, ...result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "DB error" });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
