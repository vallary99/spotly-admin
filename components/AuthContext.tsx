"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken, ApiError } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeToken(token: string): AdminUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.sub, email: payload.email, name: payload.name ?? payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous lazy init, not a useEffect — same reasoning as
  // spotly-web's AuthContext: reading localStorage during the first
  // render (rather than after mount) avoids a real race where a page's
  // own "redirect if not logged in" effect could fire before this
  // provider had a chance to read the real session.
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    const token = getToken();
    return token ? decodeToken(token) : null;
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onUnauthorized = () => {
      clearToken();
      setUser(null);
      router.push("/login");
    };
    window.addEventListener("spotly-admin:unauthorized", onUnauthorized);
    return () => window.removeEventListener("spotly-admin:unauthorized", onUnauthorized);
  }, [router]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      const decoded = decodeToken(res.accessToken);
      // Enforced server-side on every /admin/* call regardless, but
      // checking here too means a non-admin gets a clear "you don't
      // have access" message immediately at login, not a confusing
      // trail of 403s once they're already "in."
      if (!decoded || decoded.role !== "ADMIN") {
        throw new ApiError("This account doesn't have admin access.", 403);
      }
      setToken(res.accessToken);
      setUser(decoded);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
