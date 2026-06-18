import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../stub.module.css";

export default function SensorsPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("nav.sensors")}</h1>
      <p className={styles.coming}>Sprint 3 — Lista de sensores con estado en tiempo real vía WebSocket (Observer).</p>
    </div>
  );
}
