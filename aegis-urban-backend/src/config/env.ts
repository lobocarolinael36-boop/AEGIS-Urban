import "dotenv/config";

// Valida en arranque que las variables críticas existan.
// Si falta algo, el proceso termina con mensaje claro en lugar de fallar silenciosamente.
const required = [
  "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ENV] Variable de entorno requerida no encontrada: ${key}`);
    console.error(`[ENV] Copiá .env.example como .env y completá los valores.`);
    process.exit(1);
  }
}

export const env = {
  NODE_ENV:     process.env.NODE_ENV      ?? "development",
  PORT:         parseInt(process.env.PORT ?? "3001", 10),
  FRONTEND_URL: process.env.FRONTEND_URL  ?? "http://localhost:5173",

  db: {
    host:               process.env.DB_HOST!,
    port:               parseInt(process.env.DB_PORT!, 10),
    name:               process.env.DB_NAME!,
    user:               process.env.DB_USER!,
    password:           process.env.DB_PASSWORD!,
    poolMax:            parseInt(process.env.DB_POOL_MAX     ?? "20",    10),
    idleTimeoutMs:      parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10),
    connTimeoutMs:      parseInt(process.env.DB_CONN_TIMEOUT ?? "5000",  10),
  },

  jwt: {
    secret:         process.env.JWT_SECRET         ?? "dev_secret_change_in_prod",
    expiresIn:      process.env.JWT_EXPIRES_IN      ?? "24h",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  aes: {
    key: process.env.AES_SECRET_KEY ?? "",
  },
} as const;
