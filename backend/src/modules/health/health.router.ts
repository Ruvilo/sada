import { Router } from "express";
import { pool } from "../../shared/db/pg";
import { asyncHandler } from "../../shared/middleware/error-handler";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SADA backend" });
});

healthRouter.get(
  "/db-health",
  asyncHandler(async (_req, res) => {
    const result = await pool.query("SELECT NOW() as now, current_database() as db");
    res.json({ ok: true, ...result.rows[0] });
  })
);

export default healthRouter;
