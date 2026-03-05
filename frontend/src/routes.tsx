import { createBrowserRouter } from "react-router-dom";
import AppShell from "@/shared/components/layout/AppShell";

import DashboardPage from "@/modules/dashboard/DashboardPage";
import ImportsHomePage from "@/modules/imports/ImportsHomePage";
import PunchesImportPage from "@/modules/imports/punches/PunchesImportPage";
import EmployeesImportPage from "@/modules/imports/employees/EmployeesImportPage";
import SchedulesImportPage from "@/modules/imports/schedules/ScheduleImportPage";

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ opacity: 0.7, letterSpacing: "0.12em", fontSize: 12 }}>PREVIEW</div>
      <h1 style={{ margin: "6px 0 0", fontSize: 40 }}>{title}</h1>
      <p style={{ opacity: 0.7 }}>Pantalla pendiente.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <DashboardPage /> },

      // IMPORTS
      { path: "/imports", element: <ImportsHomePage /> },
      { path: "/imports/punches", element: <PunchesImportPage /> },
      { path: "/imports/employees", element: <EmployeesImportPage /> },
      { path: "/imports/schedules", element: <SchedulesImportPage /> },
      // placeholders
      { path: "/attendance", element: <Placeholder title="Asistencias" /> },
      { path: "/reports", element: <Placeholder title="Reportes" /> },
      { path: "/history", element: <Placeholder title="Historial" /> },
      { path: "/settings", element: <Placeholder title="Settings" /> },
      { path: "/help", element: <Placeholder title="Ayuda" /> },
    ],
  },
]);