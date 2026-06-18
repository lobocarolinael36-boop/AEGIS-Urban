import React, { createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api, { LoginResponse } from "../services/api";

interface AuthContextValue {
  login:  (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout: storeLogout, token } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<LoginResponse>("/auth/login", { username, password });
    setAuth(data.user, data.token);
    navigate("/dashboard", { replace: true });
  }, [setAuth, navigate]);

  const logout = useCallback(async () => {
    try {
      if (token) await api.post("/auth/logout");
    } catch {
      // ignora errores de red en logout
    } finally {
      storeLogout();
      navigate("/login", { replace: true });
    }
  }, [token, storeLogout, navigate]);

  return (
    <AuthContext.Provider value={{ login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
