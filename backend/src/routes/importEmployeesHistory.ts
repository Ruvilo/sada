import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toInt(v: any, fallback: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
}

export async function listEmployeeImportBatches(req: Request, res: Response) {
    try {
        const take = Math.min(200, toInt(req.query.take, 50)); // cap 200
        const skip = toInt(req.query.skip, 0);

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

        // Si querés el total para paginación (opcional, cuesta 1 query extra)
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
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err?.message ?? "Error inesperado" });
    }
}

export async function getEmployeeImportBatchById(req: Request, res: Response) {
    try {
        const rawParam = req.params.batchId;

        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

        if (!rawId || !/^\d+$/.test(rawId)) {
            return res.status(400).json({ ok: false, error: "batchId inválido" });
        }

        const id = BigInt(rawId);


        const batch = await prisma.employeeImportBatch.findUnique({
            where: { id },
            // Aquí sí devolvemos rejectedDetails
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
                    updated: batch.updated,
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
