import type { Request, Response } from "express";

import { prisma } from "../../../shared/db/prisma";
import { HttpError } from "../../../shared/middleware/error-handler";
import { parseBigIntId, toInt } from "../../../shared/utils/http";

export async function listEmployeeImportBatches(req: Request, res: Response) {
  const take = Math.min(200, toInt(req.query.take, 50, 0, 200));
  const skip = toInt(req.query.skip, 0, 0, Number.MAX_SAFE_INTEGER);

  const items = await prisma.employeeImportBatch.findMany({
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
      updated: true,
      rejected: true,
      createdAt: true,
    },
  });

  const total = await prisma.employeeImportBatch.count();

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
        updated: x.updated,
        rejected: x.rejected,
      },
      createdAt: x.createdAt,
    })),
  });
}

export async function getEmployeeImportBatchById(req: Request, res: Response) {
  const id = parseBigIntId(req.params.batchId, "batchId");

  const batch = await prisma.employeeImportBatch.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      fileChecksum: true,
      status: true,
      totalRows: true,
      inserted: true,
      updated: true,
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
        updated: batch.updated,
        rejected: batch.rejected,
      },
      rejectedDetails: batch.rejectedDetails,
      createdAt: batch.createdAt,
    },
  });
}
