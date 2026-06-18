import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardPage.module.css";

interface TarjetaEstadistica {
  etiqueta: string;
  valor:    string | number;
  variante: "cyan" | "warning" | "danger" | "safe";
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const usuario          = useAuthStore((s) => s.usuario);
  const { cerrarSesion } = useAuth();

  const estadisticas: TarjetaEstadistica[] = [
    { etiqueta: t("dashboard.activeSensors"),  valor: "—", variante: "cyan" },
    { etiqueta: t("dashboard.activeAlerts"),   valor: "—", variante: "warning" },
    { etiqueta: t("dashboard.criticalAlerts"), valor: "—", variante: "danger" },
  ];

  return (
    <div className={styles.page}>
      {/* ── Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L28 8 L28 22 L16 30 L4 22 L4 8 Z"
              stroke="var(--color-cyan)" strokeWidth="2" fill="none" />
            <circle cx="16" cy="16" r="3" fill="var(--color-cyan)" />
          </svg>
          <span>AEGIS Urban</span>
        </div>
        <ul className={styles.navList}>
          {[
            { href: "/dashboard",  etiqueta: t("nav.dashboard") },
            { href: "/mapa",       etiqueta: t("nav.cityMap") },
            { href: "/sensores",   etiqueta: t("nav.sensors") },
            { href: "/alertas",    etiqueta: t("nav.alerts") },
            { href: "/simulacion", etiqueta: t("nav.simulation") },
            { href: "/admin",      etiqueta: t("nav.admin") },
          ].map(({ href, etiqueta }) => (
            <li key={href}>
              <a href={href} className={styles.navLink}>{etiqueta}</a>
            </li>
          ))}
        </ul>
        <button onClick={cerrarSesion} className={styles.logoutBtn}>
          {t("nav.logout")}
        </button>
      </nav>

      {/* ── Contenido principal */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
          <span className={styles.userChip}>{usuario?.familia} — {usuario?.username}</span>
        </header>

        {/* ── Tarjetas de estadísticas */}
        <section className={styles.statsGrid}>
          {estadisticas.map((s) => (
            <div key={s.etiqueta} className={`${styles.statCard} ${styles[`statCard--${s.variante}`]}`}>
              <span className={styles.statValue}>{s.valor}</span>
              <span className={styles.statLabel}>{s.etiqueta}</span>
            </div>
          ))}
        </section>

        {/* ── Placeholder de actividad reciente */}
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Actividad Reciente</h2>
          <div className={styles.emptyState}>
            <p>{t("common.noData")}</p>
            <small>Conectá el backend y levantá el motor de simulación.</small>
          </div>
        </section>
      </main>
    </div>
  );
}
