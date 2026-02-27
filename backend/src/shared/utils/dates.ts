import { DateTime } from "luxon";

const CR_TZ = "America/Costa_Rica";

export function dayStartUTC(dateISO: string): Date {
  return DateTime.fromISO(dateISO, { zone: CR_TZ }).startOf("day").toUTC().toJSDate();
}

export function dayEndExclusiveUTC(dateISO: string): Date {
  return DateTime.fromISO(dateISO, { zone: CR_TZ })
    .startOf("day")
    .plus({ days: 1 })
    .toUTC()
    .toJSDate();
}
