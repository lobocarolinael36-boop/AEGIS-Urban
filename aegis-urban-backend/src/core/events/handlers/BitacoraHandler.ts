import { bitacora } from "../../../integrity/BitacoraService";
import { eventBus, EVENTOS } from "../EventBus";
import { DatosLecturaNueva } from "./AlertHandler";

export class BitacoraHandler {
  private inicializado = false;

  iniciar(): void {
    if (this.inicializado) return;

    eventBus.suscribir<DatosLecturaNueva>(EVENTOS.LECTURA_NUEVA, this.manejarLectura.bind(this));
    eventBus.suscribir(EVENTOS.ALERTA_CREADA,       this.manejarAlerta.bind(this));
    eventBus.suscribir(EVENTOS.EVACUACION_INICIADA, this.manejarEvacuacion.bind(this));
    eventBus.suscribir(EVENTOS.SESION_INICIADA,     this.manejarSesion.bind(this));
    eventBus.suscribir(EVENTOS.SESION_CERRADA,      this.manejarSesion.bind(this));

    this.inicializado = true;
  }

  private async manejarLectura(datos: DatosLecturaNueva): Promise<void> {
    if (datos.estadoLectura === "OK") return;  // solo registra anomalías
    try {
      await bitacora.registrarEvento({
        accion:       "SENSOR_READING_ANOMALY",
        nombreEntidad: "sensor_reading",
        idEntidad:    String(datos.idSensor),
        idUsuario:    null,
        direccionIp:  "127.0.0.1",
        valoresNuevos: {
          valor:         datos.valor,
          unidad:        datos.unidad,
          estadoLectura: datos.estadoLectura,
          tipoSensor:    datos.tipoSensor,
        },
      });
    } catch { /* no interrumpir flujo */ }
  }

  private async manejarAlerta(datos: Record<string, unknown>): Promise<void> {
    try {
      await bitacora.registrarEvento({
        accion:       "ALERT_CREATED",
        nombreEntidad: "alert",
        idEntidad:    String(datos["idAlerta"]),
        idUsuario:    null,
        direccionIp:  "127.0.0.1",
        valoresNuevos: datos,
      });
    } catch { /* no interrumpir flujo */ }
  }

  private async manejarEvacuacion(datos: Record<string, unknown>): Promise<void> {
    try {
      await bitacora.registrarEvento({
        accion:       "EVACUATION_INITIATED",
        nombreEntidad: "evacuation_plan",
        idEntidad:    String(datos["idPlan"] ?? "0"),
        idUsuario:    datos["idUsuario"] as number | null,
        direccionIp:  String(datos["ip"] ?? "127.0.0.1"),
        valoresNuevos: datos,
      });
    } catch { /* no interrumpir flujo */ }
  }

  private async manejarSesion(datos: Record<string, unknown>): Promise<void> {
    try {
      const accion = datos["evento"] === EVENTOS.SESION_INICIADA
        ? "USER_LOGIN" : "USER_LOGOUT";
      await bitacora.registrarEvento({
        accion,
        nombreEntidad: "session_token",
        idEntidad:    String(datos["idUsuario"] ?? "0"),
        idUsuario:    datos["idUsuario"] as number | null,
        direccionIp:  String(datos["ip"] ?? "127.0.0.1"),
        valoresNuevos: { username: datos["username"] },
      });
    } catch { /* no interrumpir flujo */ }
  }
}

export const bitacoraHandler = new BitacoraHandler();
