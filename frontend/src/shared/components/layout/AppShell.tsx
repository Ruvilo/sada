import styles from "./AppShell.module.scss";
import { AppIcon } from "@/shared/ui/AppIcon";
import { NavLink, Outlet, useLocation, type NavLinkRenderProps } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";


type NavItem = {
  key: string;
  label: string;
  iconName: any; // si querés, lo tipamos después con SADAIconName real
  to: string;
  end?: boolean;
};

const topItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", iconName: "dashboard", to: "/", end: true },
  { key: "attendance", label: "Asistencias", iconName: "attendance", to: "/attendance" },
];

const bottomItems: NavItem[] = [
  { key: "reports", label: "Reportes", iconName: "reports", to: "/reports" },
  { key: "history", label: "Historial", iconName: "history", to: "/history" },
  { key: "settings", label: "Settings", iconName: "settings", to: "/settings" },
  { key: "help", label: "Ayuda", iconName: "help", to: "/help" },
];

const importItems: NavItem[] = [
  { key: "imports-home", label: "Panel", iconName: "imports", to: "/imports", end: true },
  { key: "imports-schedules", label: "Horarios", iconName: "schedules", to: "/imports/schedules" },
  { key: "imports-employees", label: "Empleados", iconName: "employees", to: "/imports/employees" },
  { key: "imports-punches", label: "Punches", iconName: "imports", to: "/imports/punches" },
];

export default function AppShell() {
  const { pathname } = useLocation();

  const inImports = useMemo(
    () => pathname === "/imports" || pathname.startsWith("/imports/"),
    [pathname]
  );

  const [importsOpen, setImportsOpen] = useState<boolean>(inImports);

  useEffect(() => {
    if (inImports) setImportsOpen(true);
  }, [inImports]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>⚡</div>

        <nav className={styles.nav}>
          {topItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }: NavLinkRenderProps) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <span className={styles.navIcon}>
                <AppIcon name={item.iconName} variant="nav" />
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}

          {/* IMPORTACIONES GROUP */}
          <button
            type="button"
            className={`${styles.navItem} ${inImports ? styles.navItemActive : ""}`}
            onClick={() => setImportsOpen((v) => !v)}
            aria-expanded={importsOpen}
          >
            <span className={styles.navIcon}>
              <AppIcon name="imports" variant="nav" />
            </span>

            <span className={styles.navLabel}>Importaciones</span>

            <span className={`${styles.chevron} ${importsOpen ? styles.chevronOpen : ""}`}>
              <AppIcon name={importsOpen ? "chevronDown" : "chevronRight"} variant="chip" />
            </span>
          </button>

          <div className={`${styles.submenu} ${importsOpen ? styles.submenuOpen : ""}`}>
            {importItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }: NavLinkRenderProps) =>
                  `${styles.subItem} ${isActive ? styles.subItemActive : ""}`
                }
              >
                <span className={styles.subIcon}>
                  <AppIcon name={item.iconName} variant="chip" />
                </span>
                <span className={styles.subLabel}>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {bottomItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }: NavLinkRenderProps) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
            >
              <span className={styles.navIcon}>
                <AppIcon name={item.iconName} variant="nav" />
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.version}>v0.1.0</div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}