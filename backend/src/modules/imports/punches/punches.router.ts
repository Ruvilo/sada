import { Router } from "express";
import { asyncHandler } from "../../../shared/middleware/error-handler";
import {
  importPunchesFromExcel,
  uploadPunchesMiddleware,
} from "./punches.controller";
import {
  getPunchesImportBatchById,
  listPunchesImportBatches,
} from "./punches.history.controller";

const punchesRouter = Router();

punchesRouter.post("/", uploadPunchesMiddleware, asyncHandler(importPunchesFromExcel));
punchesRouter.get("/", asyncHandler(listPunchesImportBatches));
punchesRouter.get("/:batchId", asyncHandler(getPunchesImportBatchById));

export default punchesRouter;
