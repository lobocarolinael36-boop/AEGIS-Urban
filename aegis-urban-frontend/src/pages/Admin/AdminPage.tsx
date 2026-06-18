import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../stub.module.css";

export default function AdminPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("nav.admin")}</h1>
      <p className={styles.coming}>Sprint 5 — Gestión de usuarios, familias y patentes. Verificación de integridad DVH/DVV.</p>
    </div>
  );
}
