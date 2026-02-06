import type { Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { DateTime } from "luxon";
import { z } from "zod";
import crypto from "crypto";
import { PrismaClient, PunchType, PunchSource, ImportStatus } from "@prisma/client";

const prisma = new PrismaClient();

/** Multer (in-memory) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export const uploadPunchesMiddleware = upload.single("file");

/** ===== Helpers ===== */

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

/**
 * Busca la fila que contiene los headers del "Reporte de Eventos"
 * Espera: ID, Nombre, Fecha / Hora, Estado (y opcional Tipo de Registro)
 */
function findHeaderRow(rows: unknown[][], maxScan = 50): number {
  const limit = Math.min(rows.length, maxScan);

  for (let r = 0; r < limit; r++) {
    const vals = (rows[r] ?? [])
      .map((c) => s(c)?.toLowerCase())
      .filter(Boolean) as string[];

    const hasId = vals.includes("id");
    const hasNombre = vals.includes("nombre");
    const hasFechaHora =
      vals.includes("fecha / hora") || vals.includes("fecha/hora") || vals.includes("fecha hora");
    const hasEstado = vals.includes("estado");

    if (hasId && hasFechaHora && hasEstado) return r;
  }
  return -1;
}

type HeaderIndex = {
  id: number;
  nombre?: number;
  fechaHora: number;
  estado: number;
  tipoRegistro?: number;
  // nota: a veces viene una columna sin header; la detectamos por fallback
};

function indexFromHeader(header: unknown[]): HeaderIndex {
  const idx: Partial<HeaderIndex> = {};
  header.forEach((cell, i) => {
    const key = s(cell)?.toLowerCase();
    if (!key) return;

    if (key === "id") idx.id = i;
    if (key === "nombre") idx.nombre = i;
    if (key === "fecha / hora" || key === "fecha/hora" || key === "fecha hora") idx.fechaHora = i;
    if (key === "estado") idx.estado = i;
    if (key === "tipo de registro") idx.tipoRegistro = i;
  });

  if (idx.id === undefined || idx.fechaHora === undefined || idx.estado === undefined) {
    throw new Error("No se detectaron columnas requeridas: ID, Fecha / Hora, Estado.");
  }
  return idx as HeaderIndex;
}

function parseCRDateTimeToUTC(dateTimeStr: string): Date {
  // Formato esperado: "06/03/2025 08:09"
  const dt = DateTime.fromFormat(dateTimeStr.trim(), "dd/MM/yyyy HH:mm", {
    zone: "America/Costa_Rica",
    setZone: true,
  });
  if (!dt.isValid) throw new Error(`Fecha/Hora inválida: "${dateTimeStr}"`);
  return dt.toUTC().toJSDate();
}

function mapEstadoToPunchType(estado: string): PunchType {
  const v = estado.trim().toLowerCase();
  if (v === "entrada") return PunchType.IN;
  if (v === "salida") return PunchType.OUT;
  // por si vienen variantes:
  if (v.includes("entra")) return PunchType.IN;
  if (v.includes("sale")) return PunchType.OUT;
  throw new Error(`Estado inválido: "${estado}" (esperado: Entrada/Salida)`);
}

/** Row schema (validación base) */
const ParsedRowSchema = z.object({
  identification: z.string().min(1), // Excel "ID" -> Employee.identification
  name: z.string().optional(),
  dateTimeStr: z.string().min(1),    // Excel "Fecha / Hora"
  estado: z.string().min(1),         // Excel "Estado"
  tipoRegistro: z.string().optional(),
  note: z.string().optional(),
  rowNumber: z.number().int().positive(), // fila real en Excel (1-based)
});

type ParsedRow = z.infer<typeof ParsedRowSchema>;

/** ===== Controller ===== */

export async function importPunchesFromExcel(req: Request, res: Response) {
  let batchId: bigint | null = null;

  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: 'Falta el archivo (campo "file").' });
    }

    const filename = req.file.originalname || "import.xlsx";
    const checksum = sha256(req.file.buffer);

    // 1) Crear batch (PROCESSING)
    const batch = await prisma.attendanceImportBatch.create({
      data: {
        filename,
        fileChecksum: checksum,
        status: ImportStatus.PROCESSING,
      },
    });
    batchId = batch.id;

    // 2) Leer workbook
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const firstSheetName = wb.SheetNames[0];

    if (!firstSheetName) {
      await prisma.attendanceImportBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          rejected: 1,
          rejectedDetails: [{ rowNumber: 0, reason: "Sin hojas" }],
        },
      });
      return res.status(400).json({ ok: false, error: "El archivo no tiene hojas." });
    }

    const sheet = wb.Sheets[firstSheetName];

    // 3) Matriz de filas/columnas
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    const headerRow = findHeaderRow(rows);
    if (headerRow === -1) {
      await prisma.attendanceImportBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          rejected: 1,
          rejectedDetails: [{ rowNumber: 0, reason: "No se encontró encabezado (ID/Fecha / Hora/Estado)" }],
        },
      });
      return res.status(400).json({
        ok: false,
        error: 'No pude encontrar el header (busqué "ID", "Fecha / Hora", "Estado").',
      });
    }

    const header = rows[headerRow] ?? [];

    // ✅ 2) si indexFromHeader falla, esto es 400 + batch FAILED (no 500)
    let idx: HeaderIndex;
    try {
      idx = indexFromHeader(header);
    } catch (e: any) {
      await prisma.attendanceImportBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          rejected: 1,
          rejectedDetails: [{ rowNumber: headerRow + 1, reason: e?.message ?? "Header inválido" }],
        },
      });
      return res.status(400).json({ ok: false, error: e?.message ?? "Header inválido" });
    }

    // ✅ 1) Nota fallback SOLO si la última columna NO tiene header (vacía)
    const lastHeaderCell = header.length > 0 ? s(header[header.length - 1]) : null;
    const noteIndexFallback =
      header.length > 0 && !lastHeaderCell
        ? header.length - 1
        : undefined;

    // 4) Parsear filas (desde headerRow+1)
    const dataRows = rows.slice(headerRow + 1);

    const parsed: ParsedRow[] = [];
    const rejected: Array<{ rowNumber: number; reason: string; raw?: any }> = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] ?? [];
      const rowNumber = headerRow + 2 + i; // Excel 1-based

      const identification = s(row[idx.id]);
      const name = idx.nombre !== undefined ? s(row[idx.nombre]) : null;
      const dateTimeStr = s(row[idx.fechaHora]);
      const estado = s(row[idx.estado]);
      const tipoRegistro = idx.tipoRegistro !== undefined ? s(row[idx.tipoRegistro]) : null;

      const note =
        noteIndexFallback !== undefined
          ? s(row[noteIndexFallback])
          : null;

      // Ignorar filas vacías totales
      if (!identification && !dateTimeStr && !estado) continue;

      try {
        const obj = ParsedRowSchema.parse({
          identification: identification ?? "",
          name: name ?? undefined,
          dateTimeStr: dateTimeStr ?? "",
          estado: estado ?? "",
          tipoRegistro: tipoRegistro ?? undefined,
          note: note ?? undefined,
          rowNumber,
        });
        parsed.push(obj);
      } catch {
        rejected.push({ rowNumber, reason: "Fila incompleta (ID/Fecha/Estado)" });
      }
    }

    // 5) Resolver empleados por identification (1 query)
    const uniqueIds = Array.from(new Set(parsed.map((r) => r.identification)));
    const employees = await prisma.employee.findMany({
      where: { identification: { in: uniqueIds } },
      select: { id: true, identification: true },
    });

    const empByIdentification = new Map<string, { id: bigint; identification: string }>();
    for (const e of employees) empByIdentification.set(e.identification, e);

    // 6) Preparar punches para insert (y validar fecha/estado)
    const punchesToInsert: Array<{
      employeeId: bigint;
      punchedAt: Date;
      type: PunchType;
      source: PunchSource;
      notes: string | null;
      rawPayload: any;
      importBatchId: bigint;
      importRow: number;
    }> = [];

    for (const r of parsed) {
      const emp = empByIdentification.get(r.identification);
      if (!emp) {
        rejected.push({ rowNumber: r.rowNumber, reason: `Empleado no existe: identification=${r.identification}` });
        continue;
      }

      try {
        const punchedAt = parseCRDateTimeToUTC(r.dateTimeStr);
        const type = mapEstadoToPunchType(r.estado);

        punchesToInsert.push({
          employeeId: emp.id,
          punchedAt,
          type,
          source: PunchSource.IMPORT,
          notes: r.note ?? null,
          rawPayload: {
            identification: r.identification,
            name: r.name ?? null,
            estado: r.estado,
            tipoRegistro: r.tipoRegistro ?? null,
            originalDateTime: r.dateTimeStr,
            excelRow: r.rowNumber,
            filename,
          },
          importBatchId: batch.id,
          importRow: r.rowNumber,
        });
      } catch (err: any) {
        rejected.push({ rowNumber: r.rowNumber, reason: err?.message ?? "Error parseando fila" });
      }
    }

    // 7) Insert masivo con skipDuplicates
    const createManyResult = await prisma.attendancePunch.createMany({
      data: punchesToInsert,
      skipDuplicates: true,
    });

    const inserted = createManyResult.count;
    const totalRows = parsed.length + rejected.length;

    // 8) Update batch stats
    await prisma.attendanceImportBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.PROCESSED,
        totalRows,
        inserted,
        rejected: rejected.length,
        rejectedDetails: rejected.slice(0, 500),
      },
    });

    return res.json({
      ok: true,
      batchId: batch.id.toString(),
      filename,
      totalRows,
      parsedRows: parsed.length,
      inserted,
      rejectedCount: rejected.length,
      rejectedPreview: rejected.slice(0, 50),
      duplicatesSkipped: punchesToInsert.length - inserted,
    });
  } catch (err: any) {
    console.error(err);

    // ✅ 3) si ya existe batch, marcar FAILED para no dejarlo pegado en PROCESSING
    if (batchId !== null) {
      try {
        await prisma.attendanceImportBatch.update({
          where: { id: batchId },
          data: {
            status: ImportStatus.FAILED,
            rejectedDetails: [{ rowNumber: 0, reason: err?.message ?? "Error inesperado" }],
          },
        });
      } catch (e) {
        console.error("No pude marcar batch como FAILED:", e);
      }
    }

    return res.status(500).json({ ok: false, error: err?.message ?? "Error inesperado" });
  }
}
