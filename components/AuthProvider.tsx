"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";

type Status = "checking" | "in" | "out";

interface AuthValue {
  status: Status;
  signIn: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Holds the session state for the app.
 *
 * The session cookie is httpOnly, so the browser cannot read it directly — the
 * only way to know whether we are signed in is to ask the API. That also means a
 * session cannot be faked from the client: the cookie is what the API checks.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me")
      .then(() => {
        if (!cancelled) setStatus("in");
      })
      .catch(() => {
        if (!cancelled) setStatus("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from anywhere means the session lapsed — drop back to the login screen
  // rather than leaving a dead dashboard on screen.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        const url = String(err?.config?.url ?? "");
        if (err?.response?.status === 401 && !url.includes("/auth/")) {
          setStatus("out");
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const signIn = useCallback(async (password: string) => {
    try {
      await api.post("/auth/login", { password });
      setStatus("in");
    } catch (err) {
      throw new Error(apiError(err, "Could not sign in"));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the call fails, drop the local session.
    }
    setStatus("out");
  }, []);

  return (
    <AuthContext.Provider value={{ status, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}
