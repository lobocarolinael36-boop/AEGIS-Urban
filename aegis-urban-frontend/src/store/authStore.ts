import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UsuarioAuth {
  id:        number;
  username:  string;
  idFamilia: number;
  familia:   string;
}

interface EstadoAuth {
  usuario:            UsuarioAuth | null;
  token:              string | null;
  autenticado:        boolean;
  establecerSesion:   (usuario: UsuarioAuth, token: string) => void;
  cerrarSesion:       () => void;
}

export const useAuthStore = create<EstadoAuth>()(
  persist(
    (set) => ({
      usuario:     null,
      token:       null,
      autenticado: false,

      establecerSesion: (usuario, token) =>
        set({ usuario, token, autenticado: true }),

      cerrarSesion: () =>
        set({ usuario: null, token: null, autenticado: false }),
    }),
    {
      name: "aegis-auth",
      partialize: (estado) => ({
        usuario:     estado.usuario,
        token:       estado.token,
        autenticado: estado.autenticado,
      }),
    }
  )
);
