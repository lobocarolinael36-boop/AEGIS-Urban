import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

const usuario = { id: 1, username: "admin", idFamilia: 1, familia: "ADMIN_SISTEMA" };

describe("authStore", () => {
  beforeEach(() => useAuthStore.getState().cerrarSesion());

  it("arranca sin sesión", () => {
    const { usuario: u, token, autenticado } = useAuthStore.getState();
    expect(u).toBeNull();
    expect(token).toBeNull();
    expect(autenticado).toBe(false);
  });

  it("establecerSesion guarda usuario y token", () => {
    useAuthStore.getState().establecerSesion(usuario, "tok");
    const estado = useAuthStore.getState();
    expect(estado.autenticado).toBe(true);
    expect(estado.token).toBe("tok");
    expect(estado.usuario).toEqual(usuario);
  });

  it("cerrarSesion limpia todo", () => {
    useAuthStore.getState().establecerSesion(usuario, "tok");
    useAuthStore.getState().cerrarSesion();
    expect(useAuthStore.getState().autenticado).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
