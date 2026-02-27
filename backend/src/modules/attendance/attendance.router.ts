import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/error-handler";
import {
  evaluateAttendance,
  evaluateAttendanceRange,
  getAttendanceSummary,
  getAttendanceSummaryTop,
  listAttendanceIncidents,
} from "./attendance.controller";

const attendanceRouter = Router();

attendanceRouter.post("/evaluate", asyncHandler(evaluateAttendance));
attendanceRouter.post("/evaluate-range", asyncHandler(evaluateAttendanceRange));
attendanceRouter.get("/summary/top", asyncHandler(getAttendanceSummaryTop));
attendanceRouter.get("/summary", asyncHandler(getAttendanceSummary));
attendanceRouter.get("/incidents", asyncHandler(listAttendanceIncidents));

export default attendanceRouter;
