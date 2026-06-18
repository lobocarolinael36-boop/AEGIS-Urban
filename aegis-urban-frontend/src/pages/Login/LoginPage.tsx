import React, { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Fondo decorativo animado */}
      <div className={styles.bgGrid} aria-hidden="true" />

      <main className={styles.card}>
        {/* ── Logo / Marca */}
        <header className={styles.header}>
          <div className={styles.logoRing} aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2 L28 8 L28 22 L16 30 L4 22 L4 8 Z"
                stroke="var(--color-cyan)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M16 8 L22 12 L22 20 L16 24 L10 20 L10 12 Z"
                fill="var(--color-cyan)"
                opacity="0.2"
              />
              <circle cx="16" cy="16" r="3" fill="var(--color-cyan)" />
            </svg>
          </div>
          <h1 className={styles.title}>{t("app.name")}</h1>
          <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>
        </header>

        {/* ── Formulario */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              {t("auth.username")}
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder={t("auth.usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className={styles.input}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className={styles.submitBtn}
          >
            {loading ? (
              <>
                <span className={styles.btnSpinner} />
                {t("auth.loggingIn")}
              </>
            ) : (
              t("auth.loginButton")
            )}
          </button>
        </form>

        {/* ── Pie */}
        <footer className={styles.footer}>
          <span className={styles.securityBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            AES-256 · BCrypt · JWT
          </span>
        </footer>
      </main>
    </div>
  );
}
