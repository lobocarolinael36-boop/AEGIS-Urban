import { useEffect, useRef } from "react";
import type { EvaluacionRiesgo } from "../../services/publico";
import styles from "./DangerOverlay.module.css";

interface Props {
  evaluacion: EvaluacionRiesgo;
  onEntendido: () => void;
}

/** Cartel a pantalla completa cuando el usuario está dentro de una zona de peligro. */
export default function DangerOverlay({ evaluacion, onEntendido }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boton.current?.focus();
    navigator.vibrate?.([300, 150, 300]);
  }, []);

  return (
    <div className={styles.fondo} role="alertdialog" aria-modal="true" aria-labelledby="peligro-titulo" aria-describedby="peligro-desc">
      <div className={styles.caja}>
        <div className={styles.icono} aria-hidden="true">⚠</div>
        <h2 id="peligro-titulo">¡Estás en una zona peligrosa!</h2>
        <p id="peligro-desc" className={styles.mensaje}>
          {evaluacion.zona?.tipo} en <strong>{evaluacion.zona?.nombre}</strong>.
          {" "}Alejate lo antes posible hacia el <strong>{evaluacion.direccion}</strong>.
        </p>
        {evaluacion.rumboAlejarse !== null && (
          <div className={styles.brujula} aria-hidden="true">
            <span style={{ transform: `rotate(${evaluacion.rumboAlejarse}deg)` }}>↑</span>
          </div>
        )}
        <p className={styles.dato}>
          A {evaluacion.distanciaM} m del centro de la zona (radio de peligro: {evaluacion.zona?.radioM} m)
        </p>
        <p className={styles.emergencia}>Emergencias: <strong>911</strong> · Bomberos <strong>100</strong> · Defensa Civil <strong>103</strong></p>
        <button ref={boton} className={styles.boton} onClick={onEntendido}>Entendido, me estoy alejando</button>
      </div>
    </div>
  );
}
