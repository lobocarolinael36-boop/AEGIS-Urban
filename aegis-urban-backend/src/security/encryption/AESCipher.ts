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
  private static readonly ALGORITHM = "aes-256-cbc";
  private static readonly IV_LENGTH = 16; // AES block size

  private static getKey(): Buffer {
    const keyHex = env.aes.key;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error("[AES] AES_SECRET_KEY debe ser exactamente 64 caracteres hex (32 bytes).");
    }
    return Buffer.from(keyHex, "hex");
  }

  /** Cifra un texto plano. Retorna "iv_hex:ciphertext_hex". */
  static encrypt(plainText: string): string {
    const iv  = crypto.randomBytes(AESCipher.IV_LENGTH);
    const key = AESCipher.getKey();

    const cipher     = crypto.createCipheriv(AESCipher.ALGORITHM, key, iv);
    const encrypted  = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  /** Descifra un texto en formato "iv_hex:ciphertext_hex". */
  static decrypt(cipherText: string): string {
    const [ivHex, encryptedHex] = cipherText.split(":");
    if (!ivHex || !encryptedHex) {
      throw new Error("[AES] Formato de texto cifrado inválido. Esperado: iv:ciphertext");
    }

    const iv        = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key       = AESCipher.getKey();

    const decipher  = crypto.createDecipheriv(AESCipher.ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
