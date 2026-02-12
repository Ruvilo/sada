import express from "express";
import cors from "cors";
import { pool } from "./db";
import { uploadPunchesMiddleware, importPunchesFromExcel } from "./routes/importPunches";
import { uploadEmployeesMiddleware, importEmployeesFromExcel } from "./routes/importEmployees";
import { listEmployeeImportBatches, getEmployeeImportBatchById, } from "./routes/importEmployeesHistory";
import { listPunchesImportBatches, getPunchesImportBatchById } from "./routes/importPunchesHistory";


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

app.post("/api/imports/punches", uploadPunchesMiddleware, importPunchesFromExcel);
app.post("/api/imports/employees", uploadEmployeesMiddleware, importEmployeesFromExcel);
app.get("/api/imports/employees", listEmployeeImportBatches);
app.get("/api/imports/employees/:batchId", getEmployeeImportBatchById);
app.get("/api/imports/punches", listPunchesImportBatches);
app.get("/api/imports/punches/:batchId", getPunchesImportBatchById);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
