import { SensorType, ReadingStatus } from "../../shared/types/domain.types";

// ── Interfaz del producto Factory ─────────────────────────────────────────────
export interface ISensor {
  obtenerTipo(): SensorType;
  obtenerUnidad(): string;
  obtenerUmbralAlerta(): number;
  obtenerUmbralCritico(): number;
  evaluarLectura(valor: number): ReadingStatus;
  generarValorSimulado(): number;
}

// ── Implementaciones concretas ────────────────────────────────────────────────

class SensorInundacion implements ISensor {
  obtenerTipo(): SensorType { return "FLOOD"; }
  obtenerUnidad(): string   { return "mm"; }
  obtenerUmbralAlerta(): number   { return 150; }
  obtenerUmbralCritico(): number  { return 300; }

  evaluarLectura(valor: number): ReadingStatus {
    if (valor >= this.obtenerUmbralCritico()) return "CRITICAL";
    if (valor >= this.obtenerUmbralAlerta())  return "WARNING";
    return "OK";
  }

  generarValorSimulado(): number {
    // Distribución realista: mayormente bajo, picos ocasionales
    const base = Math.random() * 100;
    const pico = Math.random() < 0.1 ? Math.random() * 250 : 0;
    return Math.round((base + pico) * 10) / 10;
  }
}

class SensorIncendio implements ISensor {
  obtenerTipo(): SensorType { return "FIRE"; }
  obtenerUnidad(): string   { return "°C"; }
  obtenerUmbralAlerta(): number   { return 60; }
  obtenerUmbralCritico(): number  { return 120; }

  evaluarLectura(valor: number): ReadingStatus {
    if (valor >= this.obtenerUmbralCritico()) return "CRITICAL";
    if (valor >= this.obtenerUmbralAlerta())  return "WARNING";
    return "OK";
  }

  generarValorSimulado(): number {
    const ambiental = 18 + Math.random() * 12;
    const pico      = Math.random() < 0.05 ? Math.random() * 110 : 0;
    return Math.round((ambiental + pico) * 10) / 10;
  }
}

class SensorViento implements ISensor {
  obtenerTipo(): SensorType { return "WIND"; }
  obtenerUnidad(): string   { return "km/h"; }
  obtenerUmbralAlerta(): number   { return 80; }
  obtenerUmbralCritico(): number  { return 150; }

  evaluarLectura(valor: number): ReadingStatus {
    if (valor >= this.obtenerUmbralCritico()) return "CRITICAL";
    if (valor >= this.obtenerUmbralAlerta())  return "WARNING";
    return "OK";
  }

  generarValorSimulado(): number {
    const base  = 10 + Math.random() * 40;
    const rafaga = Math.random() < 0.08 ? Math.random() * 130 : 0;
    return Math.round((base + rafaga) * 10) / 10;
  }
}

class SensorCalidadAire implements ISensor {
  obtenerTipo(): SensorType { return "AIR_QUALITY"; }
  obtenerUnidad(): string   { return "AQI"; }
  obtenerUmbralAlerta(): number   { return 100; }
  obtenerUmbralCritico(): number  { return 200; }

  evaluarLectura(valor: number): ReadingStatus {
    if (valor >= this.obtenerUmbralCritico()) return "CRITICAL";
    if (valor >= this.obtenerUmbralAlerta())  return "WARNING";
    return "OK";
  }

  generarValorSimulado(): number {
    const base   = 20 + Math.random() * 60;
    const evento = Math.random() < 0.07 ? Math.random() * 170 : 0;
    return Math.round((base + evento) * 10) / 10;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export class SensorFactory {
  private static readonly catalogo: Record<SensorType, () => ISensor> = {
    FLOOD:       () => new SensorInundacion(),
    FIRE:        () => new SensorIncendio(),
    WIND:        () => new SensorViento(),
    AIR_QUALITY: () => new SensorCalidadAire(),
  };

  static crear(tipo: SensorType): ISensor {
    const constructor = this.catalogo[tipo];
    if (!constructor) {
      throw new Error(`Tipo de sensor desconocido: ${tipo}`);
    }
    return constructor();
  }

  static tiposDisponibles(): SensorType[] {
    return Object.keys(this.catalogo) as SensorType[];
  }
}
