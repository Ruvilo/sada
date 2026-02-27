import type { Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { ImportStatus } from "@prisma/client";

import { prisma } from "../../../shared/db/prisma";
import { HttpError } from "../../../shared/middleware/error-handler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadEmployeesMiddleware = upload.single("file");

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function normalizeId(raw: unknown): string | null {
  const t = s(raw);
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  return digits.length ? digits : null;
}

function isValidEmail(email: string | null): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function pickEmail(inst: string | null, alt: string | null, identification: string): string {
  const instOk = isValidEmail(inst) ? inst!.toLowerCase() : null;
  const altOk = isValidEmail(alt) ? alt!.toLowerCase() : null;
  return instOk ?? altOk ?? `no-email-${identification}@sada.local`;
}

function findHeaderRow(rows: unknown[][], maxScan = 50): number {
  const limit = Math.min(rows.length, maxScan);

  for (let r = 0; r < limit; r++) {
    const vals = (rows[r] ?? [])
      .map((c) => s(c)?.toLowerCase())
      .filter(Boolean) as string[];

    const hasId = vals.some((v) => v.includes("numero de identificación"));
    const hasNombre = vals.some((v) => v.startsWith("nombre"));
    const hasApellido1 = vals.includes("primer apellido");
    const hasApellido2 = vals.includes("segundo apellido");

    if (hasId && hasNombre && hasApellido1 && hasApellido2) return r;
  }
  return -1;
}

type HeaderIndex = Record<string, number>;

function buildHeaderIndex(headerRow: unknown[]): HeaderIndex {
  const idx: HeaderIndex = {};
  headerRow.forEach((h, i) => {
    const key = s(h)?.toLowerCase() ?? "";
    if (key) idx[key] = i;
  });
  return idx;
}

function getByIncludes(row: unknown[], headerIndex: HeaderIndex, includesText: string) {
  const key = Object.keys(headerIndex).find((k) => k.includes(includesText));
  if (!key) return null;
  return row[headerIndex[key]];
}

export async function importEmployeesFromExcel(req: Request, res: Response) {
  let batchId: bigint | null = null;

  if (!req.file?.buffer) {
    throw new HttpError(400, 'Falta el archivo (campo "file").');
  }

  const filename = req.file.originalname || "import.xlsx";
  const checksum = sha256(req.file.buffer);

  let batch: { id: bigint } | null = null;
  try {
    batch = await prisma.employeeImportBatch.create({
      data: { filename, fileChecksum: checksum, status: ImportStatus.PROCESSING },
      select: { id: true },
    });
    batchId = batch.id;
  } catch (e: any) {
    if (e?.code === "P2002") {
      const existing = await prisma.employeeImportBatch.findFirst({
        where: { fileChecksum: checksum },
        select: { id: true, status: true, createdAt: true },
      });

      return res.status(409).json({
        ok: false,
        error: "Este archivo (checksum) ya fue importado.",
        existingBatchId: existing?.id?.toString(),
        status: existing?.status,
        createdAt: existing?.createdAt,
      });
    }
    throw new HttpError(500, e?.message ?? "Error creando batch");
  }

  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const firstSheetName = wb.SheetNames[0];

    if (!firstSheetName) {
      await prisma.employeeImportBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          rejected: 1,
          rejectedDetails: [{ rowNumber: 0, reason: "Sin hojas" }],
        },
      });
      throw new HttpError(400, "El archivo no tiene hojas.");
    }

    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

    const headerRowIndex = findHeaderRow(rows);
    if (headerRowIndex < 0) {
      await prisma.employeeImportBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          rejected: 1,
          rejectedDetails: [{ rowNumber: 0, reason: "No encontré headers esperados" }],
        },
      });
      throw new HttpError(400, "No encontré los headers esperados en el Excel.");
    }

    const headerIndex = buildHeaderIndex(rows[headerRowIndex] ?? []);
    const dataRows = rows.slice(headerRowIndex + 1);

    const rejected: { rowNumber: number; reason: string }[] = [];
    let inserted = 0;
    let updated = 0;
    let parsedRows = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = headerRowIndex + 2 + i;
      const row = dataRows[i] ?? [];

      try {
        const identification = normalizeId(getByIncludes(row, headerIndex, "numero de identificación"));
        if (!identification) throw new Error("Sin identificación");

        const firstName = s(getByIncludes(row, headerIndex, "nombre")) ?? "";
        const last1 = s(getByIncludes(row, headerIndex, "primer apellido")) ?? "";
        const last2 = s(getByIncludes(row, headerIndex, "segundo apellido")) ?? "";
        const lastName = `${last1} ${last2}`.trim().replace(/\s+/g, " ");

        if (!firstName || !lastName) throw new Error("Nombre o apellidos incompletos");

        const emailInst = s(getByIncludes(row, headerIndex, "email institucional"));
        const emailAlt = s(getByIncludes(row, headerIndex, "email alternativo"));

        const email = pickEmail(emailInst, emailAlt, identification);

        parsedRows++;

        const existing = await prisma.employee.findUnique({
          where: { identification },
          select: { id: true, email: true },
        });

        if (existing) {
          if (email !== existing.email) {
            const emailOwner = await prisma.employee.findUnique({
              where: { email },
              select: { id: true },
            });

            if (emailOwner && emailOwner.id !== existing.id) {
              throw new Error(`Email ya está asignado a otra persona: ${email}`);
            }
          }

          await prisma.employee.update({
            where: { identification },
            data: { firstName, lastName, email, isActive: true },
          });

          updated++;
        } else {
          await prisma.employee.create({
            data: { identification, firstName, lastName, email, isActive: true },
          });

          inserted++;
        }
      } catch (err: any) {
        rejected.push({ rowNumber, reason: err?.message ?? "Error procesando fila" });
      }
    }

    const totalRows = parsedRows + rejected.length;

    await prisma.employeeImportBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.PROCESSED,
        totalRows,
        inserted,
        updated,
        rejected: rejected.length,
        rejectedDetails: rejected.slice(0, 500),
      },
    });

    return res.json({
      ok: true,
      batchId: batch.id.toString(),
      filename,
      totalRows,
      parsedRows,
      inserted,
      updated,
      rejectedCount: rejected.length,
      rejectedPreview: rejected.slice(0, 50),
    });
  } catch (err: any) {
    if (batchId !== null) {
      try {
        await prisma.employeeImportBatch.update({
          where: { id: batchId },
          data: {
            status: ImportStatus.FAILED,
            rejectedDetails: [{ rowNumber: 0, reason: err?.message ?? "Error inesperado" }],
          },
        });
      } catch {}
    }

    if (err?.status) throw err;
    throw new HttpError(500, err?.message ?? "Error inesperado");
  }
}
