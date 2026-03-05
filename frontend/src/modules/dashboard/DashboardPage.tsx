import styles from "./DashboardPage.module.scss";
import IntegrationCard from "./components/IntegrationCard";

function Pill({ label }: { label: string }) {
  return (
    <button className={styles.pill}>
      <span className={styles.dot} />
      {label}
    </button>
  );
}

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>Dashboard</div>
          <h1 className={styles.title}>Sistema Asistente de Asistencias</h1>
        </div>

        <button className={styles.composeBtn}>
          <span className={styles.plus}>＋</span>
          Subir registro
        </button>
      </header>

      <input
        className={styles.search}
        placeholder="Busca un empleado, una fecha, o un estado de asistencia"
      />

      <div className={styles.pills}>
        {["Ausente", "A tiempo", "Retraso", "Salida anticipada", "Todo"].map((t) => (
          <Pill key={t} label={t} />
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bienvenido al sistema de asistencias</h2>

        <div className={styles.alert}>
          <div className={styles.alertIcon}>⚠</div>
          <div>
            <div className={styles.alertTitle}>Ya se subio el registro de asistencias del dia de hoy?</div> 
            <div className={styles.alertText}>
              Recuerda que es importante mantener la informacion actualizada para un mejor seguimiento.
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Funciones integradas</h2>

        <div className={styles.grid3}>
          {[{function:"Importar archivos", description:"Importa archivos de asistencia, horarios y empleados desde Excel o CSV"}, 
          {function:"Generar reportes", description:"Genera reportes de asistencia, retrasos y ausencias amigable para el usuario"}, 
          {function:"Visualizar datos", description:"Visualiza los datos y busca empleados con filtros"}].map((n) => (
            <div key={n.function} className={styles.card}>
              <div className={styles.cardIcon}>✳</div>
              <div className={styles.cardTitle}>{n.function}</div>
              <div className={styles.cardText}>
                {n.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Todas las integraciones</h2>

        <div className={styles.grid3}>
          {[
            { title: "Importar registros de Asistencia", status: { label: "Active", tone: "success" as const }},
            { title: "Importar horarios de empleados", status: { label: "Active", tone: "success" as const } },
            { title: "Importar informacion de empleados", status: { label: "Active", tone: "success" as const } },
            { title: "Generar reportes", status: { label: "Active", tone: "success" as const } },
          ].map((it) => (
            <IntegrationCard
              key={it.title}
              title={it.title}
              description="Para ingresar puede usar el menu de la izquierda o presionando el boton read more"
              status={it.status}
              // saved={it.saved}
            />
          ))}
        </div>
      </section>
    </div>
  );
}