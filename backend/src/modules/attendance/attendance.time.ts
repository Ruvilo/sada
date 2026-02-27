import { DateTime } from "luxon";

export const CR_TZ = "America/Costa_Rica";

export function dayRangeUTCFromCR(dateISO: string) {
  const start = DateTime.fromISO(dateISO, { zone: CR_TZ }).startOf("day");
  const end = start.plus({ days: 1 });
  return { startUtc: start.toUTC().toJSDate(), endUtc: end.toUTC().toJSDate() };
}

export function weekdayCR(dateISO: string): number {
  return DateTime.fromISO(dateISO, { zone: CR_TZ }).weekday;
}

export function combineDateISOAndTimeCR(dateISO: string, time: Date): DateTime {
  const t = DateTime.fromJSDate(time, { zone: "utc" });
  const base = DateTime.fromISO(dateISO, { zone: CR_TZ });
  return base.set({
    hour: t.hour,
    minute: t.minute,
    second: t.second,
    millisecond: 0,
  });
}

export function diffMinutes(a: DateTime, b: DateTime): number {
  return Math.round(b.diff(a, "minutes").minutes);
}
