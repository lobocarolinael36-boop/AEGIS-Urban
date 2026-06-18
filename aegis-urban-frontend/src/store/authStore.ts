import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id:         number;
  username:   string;
  familyId:   number;
  familyName: string;
}

interface AuthState {
  user:    AuthUser | null;
  token:   string | null;
  isAuth:  boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout:  () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:   null,
      token:  null,
      isAuth: false,

      setAuth: (user, token) =>
        set({ user, token, isAuth: true }),

      logout: () =>
        set({ user: null, token: null, isAuth: false }),
    }),
    {
      name:    "aegis-auth",
      partialize: (state) => ({
        user:  state.user,
        token: state.token,
        isAuth: state.isAuth,
      }),
    }
  )
);
