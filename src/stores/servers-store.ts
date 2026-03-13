import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Server } from "@/types";

interface ServersState {
  servers: Server[];
  selectedServerId: string | null;
  isLoading: boolean;
  error: string | null;
  
  setServers: (servers: Server[]) => void;
  addServer: (server: Server) => void;
  updateServer: (id: string, updates: Partial<Server>) => void;
  removeServer: (id: string) => void;
  selectServer: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getServer: (id: string) => Server | undefined;
  getSelectedServer: () => Server | undefined;
}

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      selectedServerId: null,
      isLoading: false,
      error: null,

      setServers: (servers) => set({ servers }),
      
      addServer: (server) => set((state) => ({ 
        servers: [...state.servers, server] 
      })),
      
      updateServer: (id, updates) => set((state) => ({
        servers: state.servers.map((s) => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      
      removeServer: (id) => set((state) => ({
        servers: state.servers.filter((s) => s.id !== id),
        selectedServerId: state.selectedServerId === id ? null : state.selectedServerId
      })),
      
      selectServer: (id) => set({ selectedServerId: id }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      getServer: (id) => get().servers.find((s) => s.id === id),
      
      getSelectedServer: () => {
        const state = get();
        return state.servers.find((s) => s.id === state.selectedServerId);
      }
    }),
    {
      name: "linuxgsm-servers",
    }
  )
);
