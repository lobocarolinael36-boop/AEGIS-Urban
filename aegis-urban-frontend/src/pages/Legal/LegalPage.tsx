import { Link } from "react-router-dom";
import { LEGAL, TERMINOS, PRIVACIDAD, type SeccionLegal } from "../../legal/textos";
import styles from "./LegalPage.module.css";

function Documento({ titulo, version, secciones }: { titulo: string; version: string; secciones: SeccionLegal[] }) {
  return (
    <div className={styles.page}>
      <main className={styles.doc}>
        <nav className={styles.nav}>
          <Link to="/registro">← Volver al registro</Link>
          <Link to="/ciudadano">Vista ciudadana</Link>
        </nav>
        <h1>{titulo}</h1>
        <p className={styles.meta}>Versión {version} · Argentina</p>
        <p className={styles.aviso} role="note">
          Texto base del prototipo académico: pendiente de revisión legal antes de un uso real con público.
        </p>
        {secciones.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            {s.parrafos.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
      </main>
    </div>
  );
}

export function PaginaTerminos() {
  return <Documento titulo="Términos y Condiciones" version={LEGAL.VERSION_TERMINOS} secciones={TERMINOS} />;
}

export function PaginaPrivacidad() {
  return <Documento titulo="Política de Privacidad" version={LEGAL.VERSION_PRIVACIDAD} secciones={PRIVACIDAD} />;
}
