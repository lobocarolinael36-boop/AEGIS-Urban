import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";

// Refugio en el lugar — cuando evacuar es más peligroso que quedarse (ej: tormenta)
export class EstrategiaRefugio implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "REFUGIO_IN_SITU"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    return {
      estrategiaUsada:   this.obtenerNombre(),
      rutaGeojson:       JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { tipo: "refugio_principal", capacidad: 500 },
            geometry: { type: "Point", coordinates: [-58.3816, -34.6037] },
          },
          {
            type: "Feature",
            properties: { tipo: "refugio_secundario", capacidad: 300 },
            geometry: { type: "Point", coordinates: [-58.3700, -34.5950] },
          },
        ],
      }),
      personasEstimadas: 0,  // no se mueve gente
      instrucciones:
        `REFUGIO EN EL LUGAR — ${alerta.tipo}. ` +
        "Permanecer en interiores. Cerrar puertas y ventanas. " +
        "Alejarse de ventanas. Sintonizar radio de emergencia. " +
        "NO salir hasta nueva instrucción de Defensa Civil.",
    };
  }
}
