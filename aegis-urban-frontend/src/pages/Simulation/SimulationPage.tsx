import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../stub.module.css";

export default function SimulationPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("nav.simulation")}</h1>
      <p className={styles.coming}>Sprint 4 — Motor de Simulación (Mocking Engine). Patrón Strategy para rutas de evacuación.</p>
    </div>
  );
}
