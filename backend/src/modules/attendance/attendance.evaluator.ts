import type { PrismaClient, PunchType, ExceptionType, IncidentType } from "@prisma/client";
import { DateTime } from "luxon";
import {
  CR_TZ,
  combineDateISOAndTimeCR,
  dayRangeUTCFromCR,
  diffMinutes,
  weekdayCR,
} from "./attendance.time";

type TimeRange = { start: DateTime; end: DateTime };

type EvalConfig = {
  duplicateWindowMinutes: number;
  missingPairGapMinutes: number;
};

type EvalResult = {
  incidents: Array<{
    incident: IncidentType;
    expectedStart?: Date | null;
    expectedEnd?: Date | null;
    actualTime?: Date | null;
    details?: any;
  }>;
};

function clampRange(r: TimeRange): TimeRange | null {
  if (r.end <= r.start) return null;
  return r;
}

function overlapMinutes(a: TimeRange, b: TimeRange): number {
  const s = a.start > b.start ? a.start : b.start;
  const e = a.end < b.end ? a.end : b.end;
  if (e <= s) return 0;
  return Math.round(e.diff(s, "minutes").minutes);
}

function subtractRange(base: TimeRange, cut: TimeRange): TimeRange[] {
  if (cut.end <= base.start || cut.start >= base.end) return [base];

  const parts: TimeRange[] = [];
  if (cut.start > base.start) {
    const left = clampRange({ start: base.start, end: cut.start });
    if (left) parts.push(left);
  }
  if (cut.end < base.end) {
    const right = clampRange({ start: base.start < cut.end ? cut.end : base.start, end: base.end });
    if (right) parts.push(right);
  }
  return parts;
}

function subtractMany(ranges: TimeRange[], cuts: TimeRange[]): TimeRange[] {
  let current = ranges.slice();
  for (const cut of cuts) {
    const next: TimeRange[] = [];
    for (const r of current) next.push(...subtractRange(r, cut));
    current = next;
  }
  return current.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

type NormalizedPunch = {
  id: bigint;
  punchedAt: DateTime;
  type: PunchType;
  isDuplicate: boolean;
  duplicateOfId?: bigint;
};

type Session = {
  inAt?: DateTime;
  outAt?: DateTime;
  inPunchId?: bigint;
  outPunchId?: bigint;
  isComplete: boolean;
};

export async function evaluateEmployeeDay(
  prisma: PrismaClient,
  employeeId: bigint,
  dateISO: string,
  config: EvalConfig = { duplicateWindowMinutes: 2, missingPairGapMinutes: 30 }
): Promise<EvalResult> {
  const rule = await prisma.attendanceRule.findUnique({ where: { id: 1 } });
  const lateGrace = rule?.lateGraceMinutes ?? 5;
  const earlyGrace = rule?.earlyLeaveGraceMinutes ?? 5;
  const minGapCheckout = rule?.minGapMinutesToAllowCheckout ?? 20;

  const weekday = weekdayCR(dateISO);
  const { startUtc, endUtc } = dayRangeUTCFromCR(dateISO);

  const assignment = await prisma.employeeScheduleAssignment.findFirst({
    where: {
      employeeId,
      startsOn: { lte: new Date(dateISO) },
      OR: [{ endsOn: null }, { endsOn: { gte: new Date(dateISO) } }],
    },
    orderBy: { startsOn: "desc" },
    include: {
      scheduleTemplate: {
        include: {
          blocks: {
            where: { weekday },
            orderBy: { startTime: "asc" },
          },
        },
      },
    },
  });

  const allBlocks = assignment?.scheduleTemplate.blocks ?? [];
  const requiredBlocks = allBlocks.filter((b) => b.requiresPresence);

  const exceptions = await prisma.scheduleException.findMany({
    where: { employeeId, date: new Date(dateISO) },
    orderBy: { createdAt: "asc" },
  });

  const hasFullDayAbsenceOrHoliday = exceptions.some((e) => {
    const t = e.type as ExceptionType;
    const isFullDay = !e.startTime && !e.endTime;
    return isFullDay && (t === "ABSENCE" || t === "HOLIDAY");
  });

  let expected: TimeRange[] = requiredBlocks.map((b) => ({
    start: combineDateISOAndTimeCR(dateISO, b.startTime),
    end: combineDateISOAndTimeCR(dateISO, b.endTime),
  }));

  if (hasFullDayAbsenceOrHoliday) expected = [];

  const permissionCuts: TimeRange[] = exceptions
    .filter((e) => e.type === "PERMISSION" && e.startTime && e.endTime)
    .map((e) => ({
      start: combineDateISOAndTimeCR(dateISO, e.startTime!),
      end: combineDateISOAndTimeCR(dateISO, e.endTime!),
    }));

  if (permissionCuts.length) expected = subtractMany(expected, permissionCuts);

  const rawPunches = await prisma.attendancePunch.findMany({
    where: {
      employeeId,
      punchedAt: { gte: startUtc, lt: endUtc },
    },
    orderBy: { punchedAt: "asc" },
    select: { id: true, punchedAt: true, type: true },
  });

  const punches: NormalizedPunch[] = rawPunches.map((p) => ({
    id: p.id,
    punchedAt: DateTime.fromJSDate(p.punchedAt, { zone: "utc" }).setZone(CR_TZ),
    type: p.type,
    isDuplicate: false,
  }));

  if (expected.length > 0 && punches.length === 0 && !hasFullDayAbsenceOrHoliday) {
    return {
      incidents: [
        {
          incident: "ABSENT" as any,
          details: {
            note: "No punches for a day with required schedule blocks. Collapsed to ABSENT.",
            meta: {
              employeeId: String(employeeId),
              date: dateISO,
              punches: 0,
              usablePunches: 0,
              sessions: [],
              expectedBlocks: expected.map((b) => ({ start: b.start.toISO(), end: b.end.toISO() })),
            },
          },
        },
      ],
    };
  }

  const dupIds: bigint[] = [];
  for (let i = 1; i < punches.length; i++) {
    const prev = punches[i - 1];
    const cur = punches[i];
    if (cur.type === prev.type) {
      const mins = Math.abs(diffMinutes(prev.punchedAt, cur.punchedAt));
      if (mins <= config.duplicateWindowMinutes) {
        cur.isDuplicate = true;
        cur.duplicateOfId = prev.id;
        dupIds.push(cur.id);
      }
    }
  }

  const usablePunches = punches.filter((p) => !p.isDuplicate);

  const sessions: Session[] = [];
  const outWithoutInTimes: DateTime[] = [];
  const inWithoutOutTimes: DateTime[] = [];
  const missingOutBeforeNextInTimes: DateTime[] = [];

  let open: Session | null = null;

  for (const p of usablePunches) {
    if (p.type === "IN") {
      if (!open) {
        open = { inAt: p.punchedAt, inPunchId: p.id, isComplete: false };
      } else {
        const gap = Math.abs(diffMinutes(open.inAt!, p.punchedAt));
        if (gap >= config.missingPairGapMinutes) {
          missingOutBeforeNextInTimes.push(p.punchedAt);
        }
        inWithoutOutTimes.push(open.inAt!);
        sessions.push({ ...open, isComplete: false });
        open = { inAt: p.punchedAt, inPunchId: p.id, isComplete: false };
      }
    } else {
      if (!open) {
        outWithoutInTimes.push(p.punchedAt);
        continue;
      }
      const minsFromIn = diffMinutes(open.inAt!, p.punchedAt);
      if (minsFromIn < minGapCheckout) {
        continue;
      }
      open.outAt = p.punchedAt;
      open.outPunchId = p.id;
      open.isComplete = true;
      sessions.push(open);
      open = null;
    }
  }

  if (open?.inAt) {
    inWithoutOutTimes.push(open.inAt);
    sessions.push({ ...open, isComplete: false });
  }

  const completeSessions = sessions.filter((s) => s.isComplete && s.inAt && s.outAt) as Array<
    Required<Pick<Session, "inAt" | "outAt" | "inPunchId" | "outPunchId" | "isComplete">>
  >;

  const incidents: EvalResult["incidents"] = [];

  const anyPunches = punches.length > 0;

  if (!expected.length && anyPunches && !hasFullDayAbsenceOrHoliday) {
    incidents.push({
      incident: "UNSCHEDULED_WORK" as any,
      details: {
        note: "Punches exist but no required schedule blocks for this date.",
        punchCount: punches.length,
        duplicatePunchIds: dupIds.map(String),
      },
    });
  }

  if (dupIds.length) {
    incidents.push({
      incident: "DUPLICATE_PUNCHES" as any,
      details: { duplicatePunchIds: dupIds.map(String), duplicateWindowMinutes: config.duplicateWindowMinutes },
    });
  }

  if (outWithoutInTimes.length) {
    incidents.push({
      incident: "OUT_WITHOUT_IN" as any,
      actualTime: outWithoutInTimes[0].toUTC().toJSDate(),
      details: { times: outWithoutInTimes.map((t) => t.toISO()) },
    });
  }

  if (inWithoutOutTimes.length) {
    incidents.push({
      incident: "IN_WITHOUT_OUT" as any,
      actualTime: inWithoutOutTimes[0].toUTC().toJSDate(),
      details: { times: inWithoutOutTimes.map((t) => t.toISO()) },
    });
  }

  if (missingOutBeforeNextInTimes.length) {
    incidents.push({
      incident: "MISSING_OUT_BEFORE_NEXT_IN" as any,
      actualTime: missingOutBeforeNextInTimes[0].toUTC().toJSDate(),
      details: {
        times: missingOutBeforeNextInTimes.map((t) => t.toISO()),
        missingPairGapMinutes: config.missingPairGapMinutes,
      },
    });
  }

  if (expected.length) {
    const firstExpected = expected[0];
    const lastExpected = expected[expected.length - 1];

    const firstIn = usablePunches.find((p) => p.type === "IN")?.punchedAt ?? null;
    const lastOut = [...usablePunches].reverse().find((p) => p.type === "OUT")?.punchedAt ?? null;

    if (firstIn) {
      const lateMins = diffMinutes(firstExpected.start, firstIn);
      if (lateMins > lateGrace) {
        incidents.push({
          incident: "LATE_ARRIVAL" as any,
          expectedStart: firstExpected.start.toJSDate(),
          expectedEnd: firstExpected.end.toJSDate(),
          actualTime: firstIn.toUTC().toJSDate(),
          details: { lateMinutes: lateMins, lateGraceMinutes: lateGrace },
        });
      }
    } else {
      incidents.push({
        incident: "MISSING_IN" as any,
        details: { note: "No IN punch found for this date." },
      });
    }

    if (lastOut) {
      const earlyMins = diffMinutes(lastOut, lastExpected.end);
      if (earlyMins > earlyGrace) {
        incidents.push({
          incident: "EARLY_LEAVE" as any,
          expectedStart: lastExpected.start.toJSDate(),
          expectedEnd: lastExpected.end.toJSDate(),
          actualTime: lastOut.toUTC().toJSDate(),
          details: { earlyMinutes: earlyMins, earlyLeaveGraceMinutes: earlyGrace },
        });
      }
    } else {
      incidents.push({
        incident: "MISSING_OUT" as any,
        details: { note: "No OUT punch found for this date." },
      });
    }

    for (const b of expected) {
      const covered = completeSessions.reduce((acc, s) => {
        const sess: TimeRange = { start: s.inAt, end: s.outAt };
        return acc + overlapMinutes(sess, b);
      }, 0);

      if (covered <= 0) {
        incidents.push({
          incident: "ABSENT_DURING_REQUIRED_BLOCK" as any,
          expectedStart: b.start.toJSDate(),
          expectedEnd: b.end.toJSDate(),
          details: {
            note: "No session overlap with required block.",
            blockStart: b.start.toISO(),
            blockEnd: b.end.toISO(),
          },
        });
      }
    }
  }

  if (hasFullDayAbsenceOrHoliday && anyPunches) {
    incidents.push({
      incident: "UNSCHEDULED_WORK" as any,
      details: {
        note: "Punches exist on a full-day ABSENCE/HOLIDAY exception day (evidence kept).",
        exceptions: exceptions.map((e) => ({ type: e.type, startTime: e.startTime, endTime: e.endTime })),
      },
    });
  }

  incidents.forEach((i) => {
    i.details = {
      ...(i.details ?? {}),
      meta: {
        employeeId: String(employeeId),
        date: dateISO,
        punches: punches.length,
        usablePunches: usablePunches.length,
        sessions: sessions.map((s) => ({
          inAt: s.inAt?.toISO(),
          outAt: s.outAt?.toISO(),
          isComplete: s.isComplete,
        })),
        expectedBlocks: expected.map((b) => ({ start: b.start.toISO(), end: b.end.toISO() })),
      },
    };
  });

  return { incidents };
}

export async function persistEmployeeDayIncidents(
  prisma: PrismaClient,
  employeeId: bigint,
  dateISO: string,
  incidents: EvalResult["incidents"]
) {
  const dateOnly = new Date(dateISO);
  const NULL_TIME = new Date("1970-01-01T00:00:00.000Z");

  await prisma.attendanceIncident.deleteMany({
    where: { employeeId, date: dateOnly },
  });

  if (!incidents.length) {
    return { saved: 0 };
  }

  await prisma.attendanceIncident.createMany({
    data: incidents.map((inc) => ({
      employeeId,
      date: dateOnly,
      incident: inc.incident as any,
      expectedStart: inc.expectedStart ?? NULL_TIME,
      expectedEnd: inc.expectedEnd ?? NULL_TIME,
      actualTime: inc.actualTime ?? null,
      details: inc.details ?? undefined,
    })),
  });

  return { saved: incidents.length };
}
