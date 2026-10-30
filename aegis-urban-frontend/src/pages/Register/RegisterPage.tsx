import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../../context/AuthContext";
import { LEGAL, CONSENTIMIENTO_UBICACION } from "../../legal/textos";
import styles from "../Login/LoginPage.module.css";
import extra from "./RegisterPage.module.css";

export default function RegisterPage() {
  const { registrar } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [terminos, setTerminos] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [edad, setEdad] = useState(false);
  const [ubicacion, setUbicacion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los tres consentimientos obligatorios habilitan el botón; la ubicación es opcional.
  const puedeEnviar = !!usuario && !!email && contrasena.length >= 10 && terminos && privacidad && edad && !cargando;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setError(null);
    setCargando(true);
    try {
      await registrar({
        username: usuario, email, password: contrasena,
        aceptaTerminos: terminos, aceptaPrivacidad: privacidad, declaraEdad: edad, aceptaUbicacion: ubicacion,
        versionTerminos: LEGAL.VERSION_TERMINOS, versionPrivacidad: LEGAL.VERSION_PRIVACIDAD,
      });
    } catch (err) {
      setError(isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : "No se pudo crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden="true" />
      <main className={`${styles.card} ${extra.ancha}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Recibí avisos del clima y de zonas de riesgo cerca tuyo.</p>
        </header>

        <form onSubmit={enviar} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="r-usuario" className={styles.label}>Usuario</label>
            <input id="r-usuario" autoComplete="username" placeholder="4 a 30 caracteres (letras, números, _ .)"
              value={usuario} onChange={(e) => setUsuario(e.target.value)} disabled={cargando} />
          </div>
          <div className={styles.field}>
            <label htmlFor="r-email" className={styles.label}>Email</label>
            <input id="r-email" type="email" autoComplete="email" placeholder="tu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando} />
          </div>
          <div className={styles.field}>
            <label htmlFor="r-pass" className={styles.label}>Contraseña</label>
            <input id="r-pass" type="password" autoComplete="new-password" placeholder="Mínimo 10 caracteres, con letras y números"
              value={contrasena} onChange={(e) => setContrasena(e.target.value)} disabled={cargando} />
          </div>

          <fieldset className={extra.consentimientos}>
            <legend>Consentimientos</legend>

            <label className={extra.check}>
              <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} />
              <span>Leí y acepto los <Link to="/terminos" target="_blank">Términos y Condiciones</Link> <em>(obligatorio)</em></span>
            </label>

            <label className={extra.check}>
              <input type="checkbox" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} />
              <span>Leí y acepto la <Link to="/privacidad" target="_blank">Política de Privacidad</Link> y el tratamiento de mis datos según la Ley 25.326 <em>(obligatorio)</em></span>
            </label>

            <label className={extra.check}>
              <input type="checkbox" checked={edad} onChange={(e) => setEdad(e.target.checked)} />
              <span>Soy mayor de {LEGAL.EDAD_MINIMA} años o cuento con autorización de mi madre, padre o tutor/a <em>(obligatorio)</em></span>
            </label>

            <label className={`${extra.check} ${extra.opcional}`}>
              <input type="checkbox" checked={ubicacion} onChange={(e) => setUbicacion(e.target.checked)} />
              <span>
                <strong>Permitir el uso de mi ubicación</strong> para avisarme si estoy en una zona peligrosa <em>(opcional)</em>
                <small>
                  {CONSENTIMIENTO_UBICACION.map((t) => <span key={t}>{t}</span>)}
                </small>
              </span>
            </label>
          </fieldset>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" disabled={!puedeEnviar} className={styles.submitBtn}>
            {cargando ? <><span className={styles.btnSpinner} />Creando cuenta…</> : "Aceptar y crear cuenta"}
          </button>
        </form>

        <footer className={extra.pie}>
          <Link to="/login">Ya tengo cuenta</Link>
          <Link to="/ciudadano">Ver sin cuenta</Link>
        </footer>
      </main>
    </div>
  );
}
