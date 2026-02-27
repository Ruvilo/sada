import { Router } from "express";
import { asyncHandler } from "../../../shared/middleware/error-handler";
import {
  getSchedulesImportBatchById,
  listSchedulesImportBatches,
} from "./schedules.history.controller";

const schedulesHistoryRouter = Router();

schedulesHistoryRouter.get("/", asyncHandler(listSchedulesImportBatches));
schedulesHistoryRouter.get("/:id", asyncHandler(getSchedulesImportBatchById));

export default schedulesHistoryRouter;
