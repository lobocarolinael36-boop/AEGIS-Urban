import { validarRegistro } from "../../src/modules/auth/registro.service";
import { LEGAL } from "../../src/config/legal";

const valido = {
  username: "Vecina_01", email: "Vecina@Mail.com", password: "clave12345!",
  aceptaTerminos: true, aceptaPrivacidad: true, declaraEdad: true, aceptaUbicacion: false,
  versionTerminos: LEGAL.VERSION_TERMINOS, versionPrivacidad: LEGAL.VERSION_PRIVACIDAD,
};

describe("validarRegistro", () => {
  it("acepta un registro válido y normaliza usuario y email", () => {
    const d = validarRegistro(valido);
    expect(d.username).toBe("vecina_01");
    expect(d.email).toBe("vecina@mail.com");
  });

  it("la ubicación es opcional (por defecto no consentida)", () => {
    const { aceptaUbicacion: _omit, ...sinUbicacion } = valido;
    expect(validarRegistro(sinUbicacion).aceptaUbicacion).toBe(false);
  });

  it.each(["aceptaTerminos", "aceptaPrivacidad", "declaraEdad"])("rechaza si no se acepta %s", (campo) => {
    expect(() => validarRegistro({ ...valido, [campo]: false })).toThrow();
    expect(() => validarRegistro({ ...valido, [campo]: undefined })).toThrow();
  });

  it("rechaza contraseñas débiles", () => {
    expect(() => validarRegistro({ ...valido, password: "corta1" })).toThrow();
    expect(() => validarRegistro({ ...valido, password: "sololetrasaqui" })).toThrow();
    expect(() => validarRegistro({ ...valido, password: "12345678901" })).toThrow();
  });

  it("rechaza email o usuario inválidos", () => {
    expect(() => validarRegistro({ ...valido, email: "no-es-email" })).toThrow();
    expect(() => validarRegistro({ ...valido, username: "a b" })).toThrow();
  });

  it("rechaza versiones viejas de los textos legales", () => {
    expect(() => validarRegistro({ ...valido, versionTerminos: "2000-01-01" })).toThrow(/cambiaron/);
  });
});
