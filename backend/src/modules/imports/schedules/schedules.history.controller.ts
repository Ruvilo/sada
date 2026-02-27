import type { Request, Response } from "express";

import { prisma } from "../../../shared/db/prisma";
import { HttpError } from "../../../shared/middleware/error-handler";
import { parseBigIntId, toInt } from "../../../shared/utils/http";

export async function listSchedulesImportBatches(req: Request, res: Response) {
  const take = Math.min(200, toInt(req.query.take, 50, 0, 200));
  const skip = toInt(req.query.skip, 0, 0, Number.MAX_SAFE_INTEGER);

  const items = await prisma.scheduleImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take,
    skip,
    select: {
      id: true,
      filename: true,
      fileChecksum: true,
      status: true,
      totalRows: true,
      inserted: true,
      updated: true as any,
      rejected: true,
      createdAt: true,
    } as any,
  });

  const total = await prisma.scheduleImportBatch.count();

  return res.json({
    ok: true,
    total,
    take,
    skip,
    items: items.map((x: any) => ({
      ...x,
      id: x.id.toString(),
    })),
  });
}

export async function getSchedulesImportBatchById(req: Request, res: Response) {
  const id = parseBigIntId(req.params.id, "id");

  const batch = await prisma.scheduleImportBatch.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      fileChecksum: true,
      status: true,
      totalRows: true,
      inserted: true,
      updated: true as any,
      rejected: true,
      rejectedDetails: true,
      createdAt: true,
    } as any,
  });

  if (!batch) throw new HttpError(404, "Batch no encontrado");

  return res.json({
    ok: true,
    batch: {
      ...batch,
      id: (batch as any).id.toString(),
    },
  });
}
