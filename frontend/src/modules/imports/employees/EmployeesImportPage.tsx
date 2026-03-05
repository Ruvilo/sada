import styles from "./EmployeesImportPage.module.scss";
import { AppIcon } from "@/shared/ui/AppIcon";
import { useState } from "react";
import { uploadEmployeesFile, type EmployeesImportResponse } from "@/modules/imports/imports.api";

export default function EmployeesImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmployeesImportResponse | null>(null);
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
      const res = await uploadEmployeesFile(file);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo importar empleados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Importar Empleados</h1>
        <p>Sube un archivo Excel con la lista de empleados.</p>
      </header>

      <section className={styles.uploadCard}>
        <div className={styles.dropArea}>
          <AppIcon name="employees" variant="nav" />
          <div>
            <strong>Arrastra tu archivo aquí</strong>
            <p>o haz click para seleccionar</p>
          </div>

          <input type="file" accept=".xlsx" onChange={handleFileChange} />
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
          {loading ? "Procesando..." : "Procesar archivo"}
        </button>

        {error && <div style={{ opacity: 0.9 }}>Error: {error}</div>}

        {result?.ok && (
          <div style={{ opacity: 0.9 }}>
            <strong>Importación completada</strong>
            <div>Insertados: {result.inserted}</div>
            <div>Actualizados: {result.updated}</div>
            <div>Rechazados: {result.rejected}</div>
          </div>
        )}
      </section>
    </div>
  );
}