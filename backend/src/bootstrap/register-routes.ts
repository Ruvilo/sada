import type { Express } from "express";

import attendanceRouter from "../modules/attendance/attendance.router";
import healthRouter from "../modules/health/health.router";
import importsRouter from "../modules/imports/imports.router";

export function registerRoutes(app: Express) {
  app.use("/api", healthRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/imports", importsRouter);
}
