import type { Request, Response } from "express";
import { DateTime } from "luxon";

import { prisma } from "../../shared/db/prisma";
import { HttpError } from "../../shared/middleware/error-handler";
import { dayEndExclusiveUTC, dayStartUTC } from "../../shared/utils/dates";
import { isISODate, parseISODate, parseOptionalBigIntId, toInt } from "../../shared/utils/http";
import { evaluateEmployeeDay, persistEmployeeDayIncidents } from "./attendance.evaluator";

const CR_TZ = "America/Costa_Rica";

export async function evaluateAttendance(req: Request, res: Response) {
  const date = parseISODate(req.body?.date, "date");
  const employeeId = parseOptionalBigIntId(req.body?.employeeId, "employeeId");

  if (!employeeId) {
    throw new HttpError(400, `"employeeId" es requerido`);
  }

  const duplicateWindowMinutes =
    typeof req.body?.duplicateWindowMinutes === "number" ? req.body.duplicateWindowMinutes : 2;

  const missingPairGapMinutes =
    typeof req.body?.missingPairGapMinutes === "number" ? req.body.missingPairGapMinutes : 30;

  const evalRes = await evaluateEmployeeDay(prisma, employeeId, date, {
    duplicateWindowMinutes,
    missingPairGapMinutes,
  });

  const saved = await persistEmployeeDayIncidents(prisma, employeeId, date, evalRes.incidents);

  return res.json({
    ok: true,
    date,
    employeeId: String(employeeId),
    saved: saved.saved,
    incidents: evalRes.incidents,
  });
}

export async function evaluateAttendanceRange(req: Request, res: Response) {
  const from = parseISODate(req.body?.from, "from");
  const to = parseISODate(req.body?.to, "to");
  const employeeId = parseOptionalBigIntId(req.body?.employeeId, "employeeId");

  const start = DateTime.fromISO(from, { zone: CR_TZ }).startOf("day");
  const end = DateTime.fromISO(to, { zone: CR_TZ }).startOf("day");

  if (!start.isValid || !end.isValid) throw new HttpError(400, "Fechas inválidas");
  if (end < start) throw new HttpError(400, '"to" debe ser >= "from"');

  const days = end.diff(start, "days").days;
  const totalDays = Math.floor(days) + 1;

  const maxDays = toInt(req.body?.maxDays, 62, 1, 365);
  if (totalDays > maxDays) {
    throw new HttpError(400, `Rango demasiado grande (${totalDays} días). Límite actual: ${maxDays}.`);
  }

  const duplicateWindowMinutes =
    typeof req.body?.duplicateWindowMinutes === "number" ? req.body.duplicateWindowMinutes : 2;

  const missingPairGapMinutes =
    typeof req.body?.missingPairGapMinutes === "number" ? req.body.missingPairGapMinutes : 30;

  let employeeIds: bigint[] = [];

  if (employeeId) {
    employeeIds = [employeeId];
  } else {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    employeeIds = employees.map((e) => e.id);
  }

  let totalSaved = 0;
  let totalEvaluations = 0;

  const preview: Array<{
    employeeId: string;
    date: string;
    saved: number;
    incidents: number;
  }> = [];

  for (const empId of employeeIds) {
    let cursor = start;

    for (let i = 0; i < totalDays; i++) {
      const dateISO = cursor.toISODate();
      if (!dateISO) break;

      const { incidents } = await evaluateEmployeeDay(prisma, empId, dateISO, {
        duplicateWindowMinutes,
        missingPairGapMinutes,
      });

      const saved = await persistEmployeeDayIncidents(prisma, empId, dateISO, incidents);
      totalSaved += saved.saved;
      totalEvaluations++;

      if (preview.length < 50) {
        preview.push({
          employeeId: String(empId),
          date: dateISO,
          saved: saved.saved,
          incidents: incidents.length,
        });
      }

      cursor = cursor.plus({ days: 1 });
    }
  }

  return res.json({
    ok: true,
    from,
    to,
    days: totalDays,
    employees: employeeIds.length,
    evaluations: totalEvaluations,
    totalSaved,
    preview,
    note: "Preview máximo 50 filas. Los incidentes completos se consultan con /api/attendance/incidents",
  });
}

export async function listAttendanceIncidents(req: Request, res: Response) {
  const date = parseISODate(req.query.date, "date");
  const employeeId = parseOptionalBigIntId(req.query.employeeId, "employeeId");

  const where: any = {
    date: { gte: dayStartUTC(date), lt: dayEndExclusiveUTC(date) },
  };

  if (employeeId) where.employeeId = employeeId;

  const items = await prisma.attendanceIncident.findMany({
    where,
    orderBy: [{ employeeId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      employeeId: true,
      date: true,
      incident: true,
      expectedStart: true,
      expectedEnd: true,
      actualTime: true,
      details: true,
      createdAt: true,
    },
  });

  return res.json({
    ok: true,
    date,
    employeeId: employeeId ? String(employeeId) : null,
    count: items.length,
    items,
  });
}

export async function getAttendanceSummary(req: Request, res: Response) {
  const from = parseISODate(req.query.from, "from");
  const to = parseISODate(req.query.to, "to");
  const employeeId = parseOptionalBigIntId(req.query.employeeId, "employeeId");

  const fromStart = dayStartUTC(from);
  const toEndExclusive = dayEndExclusiveUTC(to);

  const where: any = {
    date: { gte: fromStart, lt: toEndExclusive },
  };

  if (employeeId) where.employeeId = employeeId;

  const grouped = await prisma.attendanceIncident.groupBy({
    by: ["incident"],
    where,
    _count: { id: true },
  });

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.incident] = g._count?.id ?? 0;

  const daysWithIncidents = await prisma.attendanceIncident.groupBy({
    by: ["date"],
    where,
    _count: { id: true },
  });

  return res.json({
    ok: true,
    from,
    to,
    employeeId: employeeId ? String(employeeId) : null,
    counts,
    incidentDays: daysWithIncidents.length,
  });
}

export async function getAttendanceSummaryTop(req: Request, res: Response) {
  const from = req.query.from;
  const to = req.query.to;

  if (!isISODate(from) || !isISODate(to)) {
    throw new HttpError(400, 'Query requiere "from" y "to" en formato YYYY-MM-DD');
  }

  const limit = Math.min(50, toInt(req.query.limit, 10, 1));

  const where: any = {
    date: { gte: dayStartUTC(from), lt: dayEndExclusiveUTC(to) },
  };

  const top = await prisma.attendanceIncident.groupBy({
    by: ["employeeId"],
    where,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const employeeIds = top.map((t) => t.employeeId);

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const nameById = new Map<string, string>();
  for (const e of employees) {
    nameById.set(String(e.id), `${e.firstName} ${e.lastName}`.trim());
  }

  const breakdown = await prisma.attendanceIncident.groupBy({
    by: ["employeeId", "incident"],
    where: { ...where, employeeId: { in: employeeIds } },
    _count: { id: true },
  });

  const byEmployee: Record<string, Record<string, number>> = {};
  for (const row of breakdown) {
    const id = String(row.employeeId);
    byEmployee[id] ??= {};
    byEmployee[id][row.incident] = row._count?.id ?? 0;
  }

  const items = top.map((t) => {
    const id = String(t.employeeId);
    return {
      employeeId: id,
      name: nameById.get(id) ?? null,
      total: t._count?.id ?? 0,
      byIncident: byEmployee[id] ?? {},
    };
  });

  return res.json({ ok: true, from, to, limit, items });
}
