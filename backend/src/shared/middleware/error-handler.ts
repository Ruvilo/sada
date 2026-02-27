import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === "number" ? err.status : 500;
  const message = err?.message ? String(err.message) : "Internal Server Error";
  const code = err?.code ? String(err.code) : undefined;

  if (status >= 500) console.error(err);

  return res.status(status).json({
    ok: false,
    error: message,
    code,
  });
}

export function asyncHandler<TReq extends Request, TRes extends Response>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<any>
) {
  return (req: TReq, res: TRes, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
