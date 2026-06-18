import crypto from "crypto";
import { env } from "../../config/env";

/**
 * AESCipher — Encriptación REVERSIBLE con AES-256-CBC.
 *
 * Usada para datos sensibles de usuarios (nombre, DNI, teléfono)
 * que el sistema necesita poder leer en algún momento.
 *
 * Formato del texto cifrado:   iv_hex:ciphertext_hex
 * El IV (vector de inicialización) es aleatorio por cada cifrado,
 * lo que impide ataques de "diccionario de cifrados".
 */
export class AESCipher {
  private static readonly ALGORITMO = "aes-256-cbc";
  private static readonly LONGITUD_IV = 16; // Tamaño de bloque AES

  private static obtenerClave(): Buffer {
    const claveHex = env.aes.key;
    if (!claveHex || claveHex.length !== 64) {
      throw new Error("[AES] AES_SECRET_KEY debe ser exactamente 64 caracteres hex (32 bytes).");
    }
    return Buffer.from(claveHex, "hex");
  }

  /** Cifra un texto plano. Retorna "iv_hex:ciphertext_hex". */
  static cifrar(textoPlano: string): string {
    const iv    = crypto.randomBytes(AESCipher.LONGITUD_IV);
    const clave = AESCipher.obtenerClave();

    const cifrador   = crypto.createCipheriv(AESCipher.ALGORITMO, clave, iv);
    const cifrado    = Buffer.concat([
      cifrador.update(textoPlano, "utf8"),
      cifrador.final(),
    ]);

    return `${iv.toString("hex")}:${cifrado.toString("hex")}`;
  }

  /** Descifra un texto en formato "iv_hex:ciphertext_hex". */
  static descifrar(textoCifrado: string): string {
    const [ivHex, cifradoHex] = textoCifrado.split(":");
    if (!ivHex || !cifradoHex) {
      throw new Error("[AES] Formato de texto cifrado inválido. Esperado: iv:ciphertext");
    }

    const iv      = Buffer.from(ivHex, "hex");
    const cifrado = Buffer.from(cifradoHex, "hex");
    const clave   = AESCipher.obtenerClave();

    const descifrador = crypto.createDecipheriv(AESCipher.ALGORITMO, clave, iv);
    const descifrado  = Buffer.concat([
      descifrador.update(cifrado),
      descifrador.final(),
    ]);

    return descifrado.toString("utf8");
  }
}
