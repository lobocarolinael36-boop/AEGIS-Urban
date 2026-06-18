import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";

type ParametrosConsulta = (string | number | boolean | null | Date | Buffer)[];

/**
 * DatabaseConnection — Patrón Singleton
 *
 * Garantiza una única instancia del Pool de conexiones pg en toda la app.
 * El constructor es privado: la única forma de obtener la instancia es
 * llamando a DatabaseConnection.obtenerInstancia().
 *
 * Thread-safety: Node.js es single-threaded (event loop), por lo que
 * la inicialización lazy del Singleton es inherentemente segura.
 */
export class DatabaseConnection {
  // La instancia única — null hasta la primera llamada a obtenerInstancia()
  private static instancia: DatabaseConnection | null = null;

  private readonly pool: Pool;
  private contadorConsultas = 0;

  // Constructor PRIVADO: impide hacer `new DatabaseConnection()` desde afuera
  private constructor() {
    this.pool = new Pool({
      host:                    env.db.host,
      port:                    env.db.port,
      database:                env.db.name,
      user:                    env.db.user,
      password:                env.db.password,
      max:                     env.db.poolMax,
      idleTimeoutMillis:       env.db.idleTimeoutMs,
      connectionTimeoutMillis: env.db.connTimeoutMs,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
    });

    this.pool.on("error", (err) => {
      console.error("[BD] Error en cliente inactivo del pool:", err.message);
    });

    if (env.NODE_ENV !== "test") {
      console.log(`[BD] Pool inicializado → ${env.db.host}:${env.db.port}/${env.db.name}`);
    }
  }

  /**
   * obtenerInstancia() — Punto de acceso global al Singleton.
   * Crea la instancia la primera vez; las siguientes veces retorna la existente.
   */
  public static obtenerInstancia(): DatabaseConnection {
    if (DatabaseConnection.instancia === null) {
      DatabaseConnection.instancia = new DatabaseConnection();
    }
    return DatabaseConnection.instancia;
  }

  /** Ejecuta una consulta SQL parametrizada con tipado genérico en el resultado. */
  public async consultar<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: ParametrosConsulta
  ): Promise<QueryResult<T>> {
    const inicio = Date.now();
    this.contadorConsultas++;

    try {
      const resultado = await this.pool.query<T>(sql, params);

      if (env.NODE_ENV === "development") {
        const ms = Date.now() - inicio;
        console.log(`[BD] #${this.contadorConsultas} ${ms}ms filas:${resultado.rowCount ?? 0}`);
      }

      return resultado;
    } catch (err) {
      const e = err as Error;
      console.error("[BD] Error en consulta:", e.message);
      throw e;
    }
  }

  /**
   * obtenerCliente() — Cliente dedicado del pool para transacciones manuales.
   * ⚠️ Siempre llamar cliente.release() en el bloque finally.
   */
  public async obtenerCliente(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /** Verifica conectividad con la BD — usado en GET /api/health */
  public async verificarConexion(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /** Estadísticas del pool para monitoreo */
  public obtenerEstadisticas() {
    return {
      total:     this.pool.totalCount,
      inactivos: this.pool.idleCount,
      en_espera: this.pool.waitingCount,
      consultas: this.contadorConsultas,
    };
  }

  /** Cierre graceful del pool — llamar en SIGTERM / SIGINT */
  public async cerrar(): Promise<void> {
    await this.pool.end();
    DatabaseConnection.instancia = null;
    console.log("[BD] Pool cerrado correctamente");
  }
}

// Instancia compartida lista para importar en cualquier módulo:
// import { db } from '@config/database';
export const db = DatabaseConnection.obtenerInstancia();
