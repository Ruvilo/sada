import cors from "cors";
import express from "express";

import { registerRoutes } from "./bootstrap/register-routes";
import { errorHandler } from "./shared/middleware/error-handler";

export function createApp() {
  const app = express();

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  app.use(cors());
  app.use(express.json());

  registerRoutes(app);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
