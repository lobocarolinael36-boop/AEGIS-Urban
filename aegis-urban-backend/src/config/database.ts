import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";

type QueryParams = (string | number | boolean | null | Date | Buffer)[];

/**
 * DatabaseConnection — Patrón Singleton
 *
 * Garantiza una única instancia del Pool de conexiones pg en toda la app.
 * El constructor es privado: la única forma de obtener la instancia es
 * llamando a DatabaseConnection.getInstance().
 *
 * Thread-safety: Node.js es single-threaded (event loop), por lo que
 * la inicialización lazy del Singleton es inherentemente segura.
 */
export class DatabaseConnection {
  // La instancia única — null hasta la primera llamada a getInstance()
  private static instance: DatabaseConnection | null = null;

  private readonly pool: Pool;
  private queryCount = 0;

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
      console.error("[DB] Error en cliente inactivo del pool:", err.message);
    });

    if (env.NODE_ENV !== "test") {
      console.log(`[DB] Pool inicializado → ${env.db.host}:${env.db.port}/${env.db.name}`);
    }
  }

  /**
   * getInstance() — Punto de acceso global al Singleton.
   * Crea la instancia la primera vez; las siguientes veces retorna la existente.
   */
  public static getInstance(): DatabaseConnection {
    if (DatabaseConnection.instance === null) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /** Ejecuta una query SQL parametrizada con tipado genérico en el resultado. */
  public async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: QueryParams
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    this.queryCount++;

    try {
      const result = await this.pool.query<T>(sql, params);

      if (env.NODE_ENV === "development") {
        const ms = Date.now() - start;
        console.log(`[DB] #${this.queryCount} ${ms}ms rows:${result.rowCount ?? 0}`);
      }

      return result;
    } catch (err) {
      const e = err as Error;
      console.error("[DB] Query error:", e.message);
      throw e;
    }
  }

  /**
   * getClient() — Cliente dedicado del pool para transacciones manuales.
   * ⚠️ Siempre llamar client.release() en el bloque finally.
   */
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /** Verifica conectividad con la BD — usado en GET /api/health */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /** Estadísticas del pool para monitoreo */
  public getStats() {
    return {
      total:   this.pool.totalCount,
      idle:    this.pool.idleCount,
      waiting: this.pool.waitingCount,
      queries: this.queryCount,
    };
  }

  /** Cierre graceful del pool — llamar en SIGTERM / SIGINT */
  public async close(): Promise<void> {
    await this.pool.end();
    DatabaseConnection.instance = null;
    console.log("[DB] Pool cerrado correctamente");
  }
}

// Instancia compartida lista para importar en cualquier módulo:
// import { db } from '@config/database';
export const db = DatabaseConnection.getInstance();
