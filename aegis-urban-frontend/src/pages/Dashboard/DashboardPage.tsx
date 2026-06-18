import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardPage.module.css";

interface StatCard {
  label:   string;
  value:   string | number;
  variant: "cyan" | "warning" | "danger" | "safe";
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const user   = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const stats: StatCard[] = [
    { label: t("dashboard.activeSensors"),  value: "—", variant: "cyan" },
    { label: t("dashboard.activeAlerts"),   value: "—", variant: "warning" },
    { label: t("dashboard.criticalAlerts"), value: "—", variant: "danger" },
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
            { href: "/dashboard",  label: t("nav.dashboard") },
            { href: "/map",        label: t("nav.cityMap") },
            { href: "/sensors",    label: t("nav.sensors") },
            { href: "/alerts",     label: t("nav.alerts") },
            { href: "/simulation", label: t("nav.simulation") },
            { href: "/admin",      label: t("nav.admin") },
          ].map(({ href, label }) => (
            <li key={href}>
              <a href={href} className={styles.navLink}>{label}</a>
            </li>
          ))}
        </ul>
        <button onClick={logout} className={styles.logoutBtn}>
          {t("nav.logout")}
        </button>
      </nav>

      {/* ── Contenido principal */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
          <span className={styles.userChip}>{user?.familyName} — {user?.username}</span>
        </header>

        {/* ── Tarjetas de estadísticas */}
        <section className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={`${styles.statCard} ${styles[`statCard--${s.variant}`]}`}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
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
