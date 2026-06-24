export interface DatosAlerta {
  idAlerta:  number;
  idSensor:  number;
  nivel:     string;
  tipo:      string;
  idNodoCiudad?: number;
}

export interface PlanEvacuacion {
  estrategiaUsada:   string;
  rutaGeojson:       string;       // GeoJSON serializado
  personasEstimadas: number;
  instrucciones:     string;
}

// ── Interfaz Strategy ─────────────────────────────────────────────────────────
export interface IEstrategiaEvacuacion {
  obtenerNombre(): string;
  calcularPlan(alerta: DatosAlerta): PlanEvacuacion;
}
