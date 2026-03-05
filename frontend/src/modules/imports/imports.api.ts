import { apiGet, apiPostForm } from "@/shared/api/http";

/**
 * Ajustá estos paths si tu backend los nombra distinto.
 * (Yo los dejo alineados con lo que venimos usando: /api/imports/*)
 */
export type ImportBatch = {
  id: string | number;
  filename: string;
  status: string; // "success" | "error" | "processing" etc
  createdAt: string;
  inserted?: number;
  updated?: number;
  rejected?: number;
};

export type ListBatchesResponse = {
  items: ImportBatch[];
  total?: number;
};

export function listPunchesBatches(params?: { take?: number; skip?: number }) {
  return apiGet<ListBatchesResponse>("/imports/punches/history", params);
}

export function listEmployeesBatches(params?: { take?: number; skip?: number }) {
  return apiGet<ListBatchesResponse>("/imports/employees/history", params);
}

export function listSchedulesBatches(params?: { take?: number; skip?: number }) {
  return apiGet<ListBatchesResponse>("/imports/schedules/history", params);
}

export type PunchesImportResponse = {
  ok: boolean;
  batchId?: string | number;
  filename?: string;
  totalRows?: number;
  parsedRows?: number;
  inserted?: number;
  rejectedCount?: number;
  rejectedPreview?: Array<{ rowNumber: number; reason: string }>;
};

export function uploadPunchesFile(file: File) {
  const form = new FormData();
  form.append("file", file); // 👈 campo obligatorio: 'file'
  return apiPostForm<PunchesImportResponse>("/imports/punches", form);
}

export type EmployeesImportResponse = {
  ok: boolean;
  inserted: number;
  updated: number;
  rejected: number;
};

export function uploadEmployeesFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<EmployeesImportResponse>("/imports/employees", form);
}

export type SchedulesImportResponse = {
  ok: boolean;
  inserted: number;
  updated: number;
  deleted: number;
  rejected: number;

  // opcional, por si el backend lo devuelve (no estorba)
  batchId?: string;
  filename?: string;
};

export async function uploadSchedulesFile(
  file: File
): Promise<SchedulesImportResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/imports/schedules", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "No se pudo importar horarios.");
  }

  return data as SchedulesImportResponse;
}