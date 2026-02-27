import { Router } from "express";

import employeesRouter from "./employees/employees.router";
import punchesRouter from "./punches/punches.router";
import schedulesRouter from "./schedules/schedules.router";
import schedulesHistoryRouter from "./schedules/schedules.history.router";

const importsRouter = Router();

importsRouter.use("/employees", employeesRouter);
importsRouter.use("/punches", punchesRouter);
importsRouter.use("/schedules", schedulesRouter);
importsRouter.use("/schedules/history", schedulesHistoryRouter);

export default importsRouter;
