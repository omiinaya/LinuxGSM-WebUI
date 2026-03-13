import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthState } from "@/types";

interface AuthStore extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user) => set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false 
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "linuxgsm-auth",
    }
  )
);
