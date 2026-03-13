"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (role: User["role"]) => boolean;
  canManageServer: (serverUserId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setError(null);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize auth system (create default admin if needed)
    fetch("/api/auth/init", { method: "POST", credentials: "include" }).catch(console.error);
    refresh();
  }, [refresh]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setError(null);
        return true;
      } else {
        const err = await res.json();
        setError(err.error || "Login failed");
        return false;
      }
    } catch (err) {
      setError("Network error");
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  const hasRole = useCallback((role: User["role"]): boolean => {
    if (!user) return false;
    const roleHierarchy = { admin: 3, operator: 2, viewer: 1 };
    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[role] || 0);
  }, [user]);

  const canManageServer = useCallback((serverUserId?: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (serverUserId && user.role === "operator") return true;
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refresh, hasRole, canManageServer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
