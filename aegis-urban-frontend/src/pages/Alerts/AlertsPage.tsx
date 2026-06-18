import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../stub.module.css";

export default function AlertsPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("nav.alerts")}</h1>
      <p className={styles.coming}>Sprint 3 — Panel de alertas con niveles INFO / LOW / MEDIUM / HIGH / CRITICAL.</p>
    </div>
  );
}
