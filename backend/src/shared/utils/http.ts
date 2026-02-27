import { HttpError } from "../middleware/error-handler";

export function isISODate(v: any): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function parseISODate(v: any, fieldName: string): string {
  if (!isISODate(v)) {
    throw new HttpError(400, `"${fieldName}" debe ser YYYY-MM-DD`);
  }
  return v;
}

export function parseOptionalBigIntId(v: any, fieldName: string): bigint | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  try {
    return BigInt(s);
  } catch {
    throw new HttpError(400, `"${fieldName}" inválido (se esperaba número entero)`);
  }
}

export function toInt(
  v: any,
  fallback: number,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const x = Math.floor(n);
  return Math.max(min, Math.min(max, x));
}

export function parseBigIntId(v: any, fieldName: string): bigint {
  const s = String(v ?? "").trim();
  if (!s) throw new HttpError(400, `"${fieldName}" es requerido`);
  if (!/^\d+$/.test(s)) throw new HttpError(400, `"${fieldName}" inválido`);
  return BigInt(s);
}
