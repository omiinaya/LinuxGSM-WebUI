export type UserRole = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  permissions: UserPermissions;
}

export interface UserPermissions {
  servers: string[];
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canInstall: boolean;
  canUpdate: boolean;
  canBackup: boolean;
  canEditConfig: boolean;
  canViewLogs: boolean;
  canAccessConsole: boolean;
  canManageAlerts: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
