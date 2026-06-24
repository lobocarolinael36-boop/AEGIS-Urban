import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";

// Evacúa solo la zona afectada (radio 500m alrededor del sensor)
export class EstrategiaZonal implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "ZONAL"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    return {
      estrategiaUsada:   this.obtenerNombre(),
      rutaGeojson:       JSON.stringify({
        type: "Feature",
        properties: { radio_metros: 500, tipo: "evacuacion_zonal" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-58.3916, -34.6137], [-58.3716, -34.6137],
            [-58.3716, -34.5937], [-58.3916, -34.5937],
            [-58.3916, -34.6137],
          ]],
        },
      }),
      personasEstimadas: 800,
      instrucciones:
        `EVACUACIÓN ZONAL — Sensor #${alerta.idSensor} (${alerta.tipo}). ` +
        "Desalojar radio 500m. Dirigirse al punto de encuentro más cercano. " +
        "Respetar señalización y personal de Defensa Civil.",
    };
  }
}
