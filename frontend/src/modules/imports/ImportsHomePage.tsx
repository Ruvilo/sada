import styles from "./ImportsHomePage.module.scss";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { listEmployeesBatches, listPunchesBatches, listSchedulesBatches, type ImportBatch } from "./imports.api";

type UiRow = ImportBatch & { type: "Horarios" | "Empleados" | "Punches" };

export default function ImportsHomePage() {
  const [rows, setRows] = useState<UiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const take = 5;

        const [punches, employees, schedules] = await Promise.all([
          listPunchesBatches({ take, skip: 0 }),
          listEmployeesBatches({ take, skip: 0 }),
          listSchedulesBatches({ take, skip: 0 }),
        ]);

        const merged: UiRow[] = [
          ...(punches.items ?? []).map((x:ImportBatch) => ({ ...x, type: "Punches" as const })),
          ...(employees.items ?? []).map((x:ImportBatch) => ({ ...x, type: "Empleados" as const })),
          ...(schedules.items ?? []).map((x:ImportBatch) => ({ ...x, type: "Horarios" as const })),
        ];

        // ordenar por createdAt desc (si viene ISO)
        merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

        if (alive) setRows(merged.slice(0, 8));
      } catch (e: any) {
        if (alive) setError(e?.message ?? "No se pudo cargar el historial.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const body = useMemo(() => {
    if (loading) return <div style={{ opacity: 0.7 }}>Cargando historial...</div>;
    if (error) return <div style={{ opacity: 0.8 }}>Error: {error}</div>;
    if (!rows.length) return <div style={{ opacity: 0.7 }}>No hay importaciones recientes.</div>;

    return (
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Archivo</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={`${b.type}-${b.id}`}>
              <td>{b.type}</td>
              <td>{b.filename}</td>
              <td>
                <span className={`${styles.status} ${styles[b.status] ?? ""}`}>
                  {b.status}
                </span>
              </td>
              <td>{b.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [loading, error, rows]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Resumen de Importaciones</h1>
          <p>Gestiona archivos de horarios, empleados y punches.</p>
        </div>

        <Link to="/imports/punches" className={styles.primaryButton}>
          <AppIcon name="imports" variant="chip" />
          Subir archivo
        </Link>
      </header>

      <section className={styles.cards}>
        <Link to="/imports/schedules" className={styles.card}>
          <AppIcon name="schedules" />
          <h3>Importar Horarios</h3>
          <p>Sube horarios en Excel.</p>
        </Link>

        <Link to="/imports/employees" className={styles.card}>
          <AppIcon name="employees" />
          <h3>Importar Empleados</h3>
          <p>Actualiza o crea empleados.</p>
        </Link>

        <Link to="/imports/punches" className={styles.card}>
          <AppIcon name="imports" />
          <h3>Importar Punches</h3>
          <p>Procesa registros de asistencia.</p>
        </Link>
      </section>

      <section className={styles.recent}>
        <h2>Últimas importaciones</h2>
        {body}
      </section>
    </div>
  );
}