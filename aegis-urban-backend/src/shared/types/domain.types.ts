// ── Tipos de dominio compartidos en todo el backend ──────────────────────────

export type SensorType = "FLOOD" | "FIRE" | "WIND" | "AIR_QUALITY";
export type SensorStatus = "ACTIVE" | "INACTIVE" | "FAULT" | "SIMULATED";
export type ReadingStatus = "OK" | "WARNING" | "CRITICAL";
export type AlertLevel = "WARNING" | "CRITICAL" | "CATASTROPHIC";
export type AlertType = "FLOOD" | "FIRE" | "WIND" | "POWER_OUT";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type NodeType = "CITY" | "DISTRICT" | "ZONE" | "BLOCK";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ScenarioStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "ABORTED";
export type EvacuationStrategy = "SHORTEST" | "SAFEST" | "CAPACITY";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        id:         number;
        username:   string;
        familyId:   number;
        familyName: string;
      };
    }
  }
}
