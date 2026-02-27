import { Router } from "express";
import { asyncHandler } from "../../../shared/middleware/error-handler";
import {
  importEmployeesFromExcel,
  uploadEmployeesMiddleware,
} from "./employees.controller";
import {
  getEmployeeImportBatchById,
  listEmployeeImportBatches,
} from "./employees.history.controller";

const employeesRouter = Router();

employeesRouter.post("/", uploadEmployeesMiddleware, asyncHandler(importEmployeesFromExcel));
employeesRouter.get("/", asyncHandler(listEmployeeImportBatches));
employeesRouter.get("/:batchId", asyncHandler(getEmployeeImportBatchById));

export default employeesRouter;
