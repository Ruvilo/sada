import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toInt(v: unknown, fallback: number) {
  if (Array.isArray(v)) v = v[0];
  if (typeof v !== "string") return fallback;

  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function getSingleParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}

/** GET /api/imports/punches?take=50&skip=0 */
export async function listPunchesImportBatches(req: Request, res: Response) {
  try {
    const take = Math.min(200, toInt(req.query.take, 50));
    const skip = toInt(req.query.skip, 0);

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
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message ?? "Error inesperado" });
  }
}

/** GET /api/imports/punches/:batchId */
export async function getPunchesImportBatchById(req: Request, res: Response) {
  try {
    const rawId = getSingleParam(req.params.batchId);

    if (!rawId || !/^\d+$/.test(rawId)) {
      return res.status(400).json({ ok: false, error: "batchId inválido" });
    }

    const id = BigInt(rawId);

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

    if (!batch) {
      return res.status(404).json({ ok: false, error: "Batch no encontrado" });
    }

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

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message ?? "Error inesperado" });
  }
}
