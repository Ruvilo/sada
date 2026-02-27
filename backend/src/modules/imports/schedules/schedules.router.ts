import { Router } from "express";
import { asyncHandler } from "../../../shared/middleware/error-handler";
import {
  importSchedulesFromExcel,
  uploadSchedulesMiddleware,
} from "./schedules.controller";

const schedulesRouter = Router();

schedulesRouter.post("/", uploadSchedulesMiddleware, asyncHandler(importSchedulesFromExcel));

export default schedulesRouter;
