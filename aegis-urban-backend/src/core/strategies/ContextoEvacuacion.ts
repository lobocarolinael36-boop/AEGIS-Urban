import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";
import { EstrategiaZonal } from "./EstrategiaZonal";
import { EstraategiaMasiva } from "./EstraategiaMasiva";
import { EstrategiaRefugio } from "./EstrategiaRefugio";
import { db } from "../../config/database";
import { eventBus, EVENTOS } from "../events/EventBus";

export class ContextoEvacuacion {
  private estrategia: IEstrategiaEvacuacion;

  // Estrategia predeterminada: zonal (menos invasiva)
  constructor(estrategia?: IEstrategiaEvacuacion) {
    this.estrategia = estrategia ?? new EstrategiaZonal();
  }

  establecerEstrategia(estrategia: IEstrategiaEvacuacion): this {
    this.estrategia = estrategia;
    return this;
  }

  obtenerEstrategia(): IEstrategiaEvacuacion {
    return this.estrategia;
  }

  async ejecutarEvacuacion(alerta: DatosAlerta, idUsuario?: number): Promise<PlanEvacuacion> {
    const plan = this.estrategia.calcularPlan(alerta);

    const [registro] = (await db.consultar<{ id_plan: number }>(
      `INSERT INTO evacuation_plan
         (id_alert, strategy_used, route_geojson, estimated_people, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id_plan`,
      [alerta.idAlerta, plan.estrategiaUsada, plan.rutaGeojson, plan.personasEstimadas]
    )).rows;

    await eventBus.emitir(EVENTOS.EVACUACION_INICIADA, {
      idPlan:      registro.id_plan,
      idAlerta:    alerta.idAlerta,
      estrategia:  plan.estrategiaUsada,
      idUsuario:   idUsuario ?? null,
    });

    return plan;
  }

  // Selección automática de estrategia según nivel de alerta
  static seleccionarAutomatica(nivel: string, tipo: string): IEstrategiaEvacuacion {
    if (tipo === "WIND" || tipo === "POWER_OUT") return new EstrategiaRefugio();
    if (nivel === "CRITICAL" || nivel === "CATASTROPHIC") return new EstraategiaMasiva();
    return new EstrategiaZonal();
  }
}
