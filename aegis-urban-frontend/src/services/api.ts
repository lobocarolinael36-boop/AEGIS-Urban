import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request: adjunta el JWT en cada request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: limpia sesión si el backend devuelve 401
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().cerrarSesion();
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Tipos de respuesta API
export interface RespuestaApi<T> {
  success: boolean;
  data:    T;
  message?: string;
}

export interface RespuestaLogin {
  token:   string;
  user: {
    id:         number;
    username:   string;
    familyId:   number;
    familyName: string;
  };
}
