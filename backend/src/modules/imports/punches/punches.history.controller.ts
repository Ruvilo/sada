import type { Request, Response } from "express";

import { prisma } from "../../../shared/db/prisma";
import { HttpError } from "../../../shared/middleware/error-handler";
import { parseBigIntId, toInt } from "../../../shared/utils/http";

export async function listPunchesImportBatches(req: Request, res: Response) {
  const take = Math.min(200, toInt(req.query.take, 50, 0, 200));
  const skip = toInt(req.query.skip, 0, 0, Number.MAX_SAFE_INTEGER);

  const items = await prisma.attendanceImportBatch.findMany({
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
      rejected: true,
      createdAt: true,
    },
  });

  const total = await prisma.attendanceImportBatch.count();

  return res.json({
    ok: true,
    total,
    take,
    skip,
    items: items.map((x) => ({
      id: x.id.toString(),
      filename: x.filename,
      fileChecksum: x.fileChecksum,
      status: x.status,
      totals: {
        totalRows: x.totalRows,
        inserted: x.inserted,
        updated: 0,
        rejected: x.rejected,
      },
      createdAt: x.createdAt,
    })),
  });
}

export async function getPunchesImportBatchById(req: Request, res: Response) {
  const id = parseBigIntId(req.params.batchId, "batchId");

  const batch = await prisma.attendanceImportBatch.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      fileChecksum: true,
      status: true,
      totalRows: true,
      inserted: true,
      rejected: true,
      rejectedDetails: true,
      createdAt: true,
    },
  });

  if (!batch) throw new HttpError(404, "Batch no encontrado");

  return res.json({
    ok: true,
    batch: {
      id: batch.id.toString(),
      filename: batch.filename,
      fileChecksum: batch.fileChecksum,
      status: batch.status,
      totals: {
        totalRows: batch.totalRows,
        inserted: batch.inserted,
        updated: 0,
        rejected: batch.rejected,
      },
      rejectedDetails: batch.rejectedDetails,
      createdAt: batch.createdAt,
    },
  });
}
