import type { Request, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { ImportStatus, ScheduleBlockType } from "@prisma/client";

import { prisma } from "../../../shared/db/prisma";
import { HttpError } from "../../../shared/middleware/error-handler";

const upload = multer({ storage: multer.memoryStorage() });

export const uploadSchedulesMiddleware = upload.single("file");

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normalizeCellText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim();
}

function isTruthyConfirm(v: string): boolean {
  const s = v.trim().toLowerCase();
  return ["sí", "si", "s", "yes", "true", "1", "confirmo", "confirmado"].includes(s);
}

function parseTimeRangeFromHeader(header: string): { startHHMM: string; endHHMM: string } | null {
  const m = header.match(/\[(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\]/);
  if (!m) return null;

  const pad = (t: string) => {
    const [h, mm] = t.split(":");
    return `${h.padStart(2, "0")}:${mm}`;
  };

  return { startHHMM: pad(m[1]), endHHMM: pad(m[2]) };
}

function extractYearFromHeaders(headers: string[]): number {
  for (const h of headers) {
    const m = h.match(/horario\s*(\d{4})/i);
    if (m) return Number(m[1]);
  }
  throw new Error('No pude detectar el año (ej: "horario 2026") en los encabezados.');
}

function asDateOnlyUTC(year: number, month1: number, day: number) {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

function timeToDate(timeHHMM: string) {
  return new Date(`1970-01-01T${timeHHMM}:00.000Z`);
}

function normalizeDayName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dayToWeekday(day: string): number | null {
  const map: Record<string, number> = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    domingo: 7,
  };
  return map[normalizeDayName(day)] ?? null;
}

type ParsedEmployeeSchedule = {
  cedula: string;
  email: string | null;
  rowNumber: number;
  blocks: Array<{
    weekday: number;
    startHHMM: string;
    endHHMM: string;
    blockType: ScheduleBlockType;
    label: string | null;
    requiresPresence: boolean;
  }>;
};

function parseEmployeeSchedules(sheet: XLSX.WorkSheet): {
  totalRows: number;
  year: number;
  items: ParsedEmployeeSchedule[];
} {
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  if (!rows.length) return { totalRows: 0, year: NaN, items: [] };

  const headers = Object.keys(rows[0] || {});
  const year = extractYearFromHeaders(headers);

  const headerCedula =
    headers.find((h) => normalizeDayName(h) === "cedula") ||
    headers.find((h) => normalizeDayName(h).includes("cedula"));

  const headerEmail =
    headers.find((h) => normalizeDayName(h) === "direccion de correo electronico") ||
    headers.find((h) => normalizeDayName(h).includes("correo"));

  const headerConfirm = headers.find((h) => normalizeDayName(h).includes("confirma que ha seleccionado"));

  if (!headerCedula) {
    throw new Error(`No encontré la columna "Cedula". Headers: ${headers.join(" | ")}`);
  }

  const blockCols = headers
    .map((h) => ({ h, tr: parseTimeRangeFromHeader(h) }))
    .filter((x) => x.tr != null) as Array<{ h: string; tr: { startHHMM: string; endHHMM: string } }>;

  if (!blockCols.length) {
    throw new Error(`No encontré columnas tipo: horario ${year} [7:00 - 7:40]`);
  }

  const items: ParsedEmployeeSchedule[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const excelRowNumber = i + 2;

    const cedula = normalizeCellText(r[headerCedula]);
    if (!cedula) continue;

    if (headerConfirm) {
      const conf = normalizeCellText(r[headerConfirm]);
      if (!isTruthyConfirm(conf)) continue;
    }

    const email = headerEmail ? normalizeCellText(r[headerEmail]) : "";
    const blocks: ParsedEmployeeSchedule["blocks"] = [];

    for (const bc of blockCols) {
      const cellValue = normalizeCellText(r[bc.h]);
      if (!cellValue) continue;

      const days = cellValue
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      for (const day of days) {
        const weekday = dayToWeekday(day);
        if (!weekday) continue;

        blocks.push({
          weekday,
          startHHMM: bc.tr.startHHMM,
          endHHMM: bc.tr.endHHMM,
          blockType: ScheduleBlockType.CLASS,
          label: null,
          requiresPresence: true,
        });
      }
    }

    items.push({
      cedula,
      email: email || null,
      rowNumber: excelRowNumber,
      blocks,
    });
  }

  return { totalRows: rows.length, year, items };
}

async function upsertEmployeeYearSchedule(opts: {
  employeeId: bigint;
  year: number;
  blocks: ParsedEmployeeSchedule["blocks"];
}): Promise<{ inserted: boolean; updated: boolean }> {
  const { employeeId, year, blocks } = opts;

  const validFrom = asDateOnlyUTC(year, 1, 1);
  const validTo = asDateOnlyUTC(year, 12, 31);
  const templateName = `HORARIO ${year} - ${employeeId.toString()}`;

  return await prisma.$transaction(async (tx) => {
    let inserted = false;
    let updated = false;

    let template = await tx.scheduleTemplate.findFirst({
      where: { name: templateName, validFrom },
      select: { id: true },
    });

    if (!template) {
      template = await tx.scheduleTemplate.create({
        data: { name: templateName, validFrom, validTo },
        select: { id: true },
      });
      inserted = true;
    }

    const existingAssign = await tx.employeeScheduleAssignment.findFirst({
      where: { employeeId, startsOn: validFrom, endsOn: validTo },
      select: { id: true, scheduleTemplateId: true },
    });

    if (!existingAssign) {
      await tx.employeeScheduleAssignment.create({
        data: {
          employeeId,
          scheduleTemplateId: template.id,
          startsOn: validFrom,
          endsOn: validTo,
        },
      });
      inserted = true;
    } else if (existingAssign.scheduleTemplateId !== template.id) {
      await tx.employeeScheduleAssignment.update({
        where: { id: existingAssign.id },
        data: { scheduleTemplateId: template.id },
      });
      updated = true;
    }

    const currentBlocks = await tx.scheduleBlock.findMany({
      where: { scheduleTemplateId: template.id },
      select: {
        weekday: true,
        startTime: true,
        endTime: true,
        blockType: true,
        label: true,
        requiresPresence: true,
      },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    const nextBlocks = blocks
      .map((b) => ({
        weekday: b.weekday,
        startTime: timeToDate(b.startHHMM),
        endTime: timeToDate(b.endHHMM),
        blockType: b.blockType,
        label: b.label,
        requiresPresence: b.requiresPresence,
      }))
      .sort((a, b) => a.weekday - b.weekday || a.startTime.getTime() - b.startTime.getTime());

    const same =
      currentBlocks.length === nextBlocks.length &&
      currentBlocks.every((cb, i) => {
        const nb = nextBlocks[i];
        return (
          cb.weekday === nb.weekday &&
          cb.blockType === nb.blockType &&
          cb.requiresPresence === nb.requiresPresence &&
          (cb.label ?? null) === (nb.label ?? null) &&
          cb.startTime.getUTCHours() === nb.startTime.getUTCHours() &&
          cb.startTime.getUTCMinutes() === nb.startTime.getUTCMinutes() &&
          cb.endTime.getUTCHours() === nb.endTime.getUTCHours() &&
          cb.endTime.getUTCMinutes() === nb.endTime.getUTCMinutes()
        );
      });

    if (!same) {
      await tx.scheduleBlock.deleteMany({ where: { scheduleTemplateId: template.id } });
      if (nextBlocks.length) {
        await tx.scheduleBlock.createMany({
          data: nextBlocks.map((b) => ({ ...b, scheduleTemplateId: template.id })),
        });
      }
      updated = true;
    }

    return { inserted, updated };
  });
}

export async function importSchedulesFromExcel(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new HttpError(400, "Falta archivo: field 'file'.");

  const filename = file.originalname;
  const checksum = sha256(file.buffer);

  let batch: { id: bigint } | null = null;

  try {
    batch = await prisma.scheduleImportBatch.create({
      data: {
        filename,
        fileChecksum: checksum,
        status: ImportStatus.PROCESSING,
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const existing = await prisma.scheduleImportBatch.findFirst({
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
    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error("Excel sin hoja válida.");

    const parsed = parseEmployeeSchedules(sheet);
    const year = parsed.year;

    let inserted = 0;
    let updated = 0;
    let rejected = 0;

    const rejectedDetails: Array<{
      rowNumber?: number;
      reason: string;
      cedula?: string;
      email?: string | null;
    }> = [];

    for (const item of parsed.items) {
      try {
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [{ identification: item.cedula }, ...(item.email ? [{ email: item.email }] : [])],
          },
          select: { id: true },
        });

        if (!employee) {
          rejected++;
          rejectedDetails.push({
            rowNumber: item.rowNumber,
            reason: "Empleado no existe (cédula/email no encontrado).",
            cedula: item.cedula,
            email: item.email,
          });
          continue;
        }

        const r = await upsertEmployeeYearSchedule({
          employeeId: employee.id,
          year,
          blocks: item.blocks,
        });

        if (r.inserted) inserted++;
        if (r.updated) updated++;
      } catch (e: any) {
        rejected++;
        rejectedDetails.push({
          rowNumber: item.rowNumber,
          reason: e?.message ?? "Error desconocido procesando fila.",
          cedula: item.cedula,
          email: item.email,
        });
      }
    }

    await prisma.scheduleImportBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.PROCESSED,
        totalRows: parsed.totalRows,
        inserted,
        updated,
        rejected,
        rejectedDetails: rejectedDetails.slice(0, 500),
      } as any,
    });

    return res.json({
      ok: true,
      batchId: batch.id.toString(),
      filename,
      year,
      totalRows: parsed.totalRows,
      inserted,
      updated,
      rejectedCount: rejected,
      rejectedPreview: rejectedDetails.slice(0, 25),
    });
  } catch (e: any) {
    await prisma.scheduleImportBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.FAILED,
        rejectedDetails: [{ reason: e?.message ?? "Error desconocido" }],
      },
    });

    throw new HttpError(500, e?.message ?? "FAILED");
  }
}
