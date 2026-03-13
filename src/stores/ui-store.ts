import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type ViewMode = "grid" | "list";

interface UIState {
  theme: Theme;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  activeTab: string;
  showConnectionModal: boolean;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setShowConnectionModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  theme: "dark",
  viewMode: "grid",
  sidebarOpen: true,
  commandPaletteOpen: false,
  activeTab: "overview",
  showConnectionModal: false,

  setTheme: (theme) => set({ theme }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowConnectionModal: (open) => set({ showConnectionModal: open }),
}));
