import React, { createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api, { RespuestaLogin } from "../services/api";

interface ValorContextoAuth {
  iniciarSesion: (username: string, contrasena: string) => Promise<void>;
  cerrarSesion:  () => Promise<void>;
}

const ContextoAuth = createContext<ValorContextoAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { establecerSesion, cerrarSesion: limpiarSesion, token } = useAuthStore();
  const navegar = useNavigate();

  const iniciarSesion = useCallback(async (username: string, contrasena: string) => {
    const { data } = await api.post<RespuestaLogin>("/auth/login", { username, password: contrasena });
    establecerSesion(
      {
        id:        data.user.id,
        username:  data.user.username,
        idFamilia: data.user.familyId,
        familia:   data.user.familyName,
      },
      data.token
    );
    navegar("/dashboard", { replace: true });
  }, [establecerSesion, navegar]);

  const cerrarSesion = useCallback(async () => {
    try {
      if (token) await api.post("/auth/logout");
    } catch {
      // Ignora errores de red en cierre de sesión
    } finally {
      limpiarSesion();
      navegar("/login", { replace: true });
    }
  }, [token, limpiarSesion, navegar]);

  return (
    <ContextoAuth.Provider value={{ iniciarSesion, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): ValorContextoAuth {
  const ctx = useContext(ContextoAuth);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
