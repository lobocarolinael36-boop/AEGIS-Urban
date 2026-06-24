import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";

// Evacúa distrito completo — para alertas CATASTROPHIC o múltiples sensores críticos
export class EstraategiaMasiva implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "MASIVA"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    return {
      estrategiaUsada:   this.obtenerNombre(),
      rutaGeojson:       JSON.stringify({
        type: "Feature",
        properties: { tipo: "evacuacion_masiva", nivel: "DISTRITO" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [[
            [[-58.4216, -34.6337], [-58.3416, -34.6337],
             [-58.3416, -34.5737], [-58.4216, -34.5737],
             [-58.4216, -34.6337]],
          ]],
        },
      }),
      personasEstimadas: 45_000,
      instrucciones:
        `EVACUACIÓN MASIVA — Alerta CRÍTICA (${alerta.tipo}). ` +
        "Evacuar el distrito completo de inmediato. Usar rutas de evacuación principales. " +
        "Llevar documentos, medicamentos y agua. NO usar ascensores. " +
        "Seguir instrucciones de Defensa Civil y Bomberos.",
    };
  }
}
