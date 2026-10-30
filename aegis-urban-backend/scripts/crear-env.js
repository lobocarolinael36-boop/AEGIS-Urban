// Crea .env a partir de .env.example con secretos aleatorios (no pisa un .env existente).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const raiz = path.join(__dirname, "..");
const destino = path.join(raiz, ".env");
if (fs.existsSync(destino)) {
  console.log(".env ya existe, no se modifica.");
  process.exit(0);
}

const hex = (n) => crypto.randomBytes(n).toString("hex");
const contenido = fs.readFileSync(path.join(raiz, ".env.example"), "utf8")
  .replace("REEMPLAZAR_CON_STRING_ALEATORIO_DE_64_CHARS", hex(64))
  .replace("REEMPLAZAR_CON_64_CHARS_HEX", hex(32));
fs.writeFileSync(destino, contenido);
console.log(".env creado con secretos aleatorios.");
