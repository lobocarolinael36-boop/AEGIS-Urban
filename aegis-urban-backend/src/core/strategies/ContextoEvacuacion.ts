import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";
import { EstrategiaZonal } from "./EstrategiaZonal";
import { EstraategiaMasiva } from "./EstraategiaMasiva";
import { EstrategiaRefugio } from "./EstrategiaRefugio";
import { db } from "../../config/database";
import { eventBus, EVENTOS } from "../events/EventBus";
import { bitacora } from "../../integrity/BitacoraService";

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

  async ejecutarEvacuacion(alerta: DatosAlerta, idUsuario?: number, ip?: string): Promise<PlanEvacuacion> {
    const plan = this.estrategia.calcularPlan(alerta);

    const cliente = await db.obtenerCliente();
    let idPlan: number | undefined;
    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");
      const resultado = await cliente.query<{ id_plan: number }>(
        `INSERT INTO evacuation_plan
           (id_alert, strategy_used, route_geojson, estimated_people, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id_plan`,
        [alerta.idAlerta, plan.estrategiaUsada, plan.rutaGeojson, plan.personasEstimadas],
      );
      idPlan = resultado.rows[0].id_plan;
      await bitacora.registrarEventoEnTransaccion(cliente, {
        accion: "EVACUATION_INITIATED",
        nombreEntidad: "evacuation_plan",
        idEntidad: String(idPlan),
        idUsuario: idUsuario ?? null,
        direccionIp: ip ?? "127.0.0.1",
        valoresNuevos: {
          idPlan,
          idAlerta: alerta.idAlerta,
          estrategia: plan.estrategiaUsada,
          estado: "ACTIVE",
        },
      });
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
    if (idPlan === undefined) throw new Error("No se pudo confirmar el plan de evacuación");

    await eventBus.emitir(EVENTOS.EVACUACION_INICIADA, {
      idPlan,
      idAlerta:    alerta.idAlerta,
      estrategia:  plan.estrategiaUsada,
      idUsuario:   idUsuario ?? null,
      ip:          ip ?? "127.0.0.1",
    });

    return plan;
  }

  // Selección automática de estrategia según nivel de alerta
  static seleccionarAutomatica(nivel: string, tipo: string): IEstrategiaEvacuacion {
    if (tipo === "WIND" || tipo === "AIR_QUALITY" || tipo === "POWER_OUT") return new EstrategiaRefugio();
    if (nivel === "CRITICAL" || nivel === "CATASTROPHIC") return new EstraategiaMasiva();
    return new EstrategiaZonal();
  }
}
