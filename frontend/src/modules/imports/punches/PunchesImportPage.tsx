import styles from "./PunchesImportPage.module.scss";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useState } from "react";
import { uploadPunchesFile, type PunchesImportResponse } from "@/modules/imports/imports.api";

export default function PunchesImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PunchesImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await uploadPunchesFile(file);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo importar el archivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Importar Punches</h1>
        <p>Sube un archivo CSV o Excel con registros de asistencia.</p>
      </header>

      <section className={styles.uploadCard}>
        <div className={styles.dropArea}>
          <AppIcon name="imports" variant="nav" />
          <div>
            <strong>Arrastra tu archivo aquí</strong>
            <p>o haz click para seleccionar</p>
          </div>

          <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
        </div>

        {file && (
          <div className={styles.fileInfo}>
            <AppIcon name="fileUp" variant="chip" />
            <span>{file.name}</span>
          </div>
        )}

        <button
          className={styles.primaryButton}
          disabled={!file || loading}
          onClick={handleUpload}
        >
          <AppIcon name="imports" variant="chip" />
          {loading ? "Procesando..." : "Procesar archivo"}
        </button>

        {error && (
          <div style={{ opacity: 0.9 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result?.ok && (
          <div style={{ opacity: 0.9 }}>
            <strong>Importación OK</strong>
            <div>Batch: {String(result.batchId ?? "")}</div>
            <div>Archivo: {result.filename}</div>
            <div>Total filas: {result.totalRows}</div>
            <div>Parseadas: {result.parsedRows}</div>
            <div>Insertadas: {result.inserted}</div>
            <div>Rechazadas: {result.rejectedCount}</div>
          </div>
        )}
      </section>
    </div>
  );
}