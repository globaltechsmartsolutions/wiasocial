"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { safeInternalRedirect } from "@/lib/safe-redirect";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithInstagram: (redirect?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    const timeout = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    try {
      const sb = getSupabase();

      sb.auth.getSession()
        .then(({ data: { session: s } }) => {
          if (!active) return;
          setSession(s);
          setUser(s?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          if (active) setLoading(false);
        })
        .finally(() => window.clearTimeout(timeout));

      const authState = sb.auth.onAuthStateChange((_event, s) => {
        if (!active) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });
      subscription = authState.data.subscription;
    } catch {
      setLoading(false);
      window.clearTimeout(timeout);
    }

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithInstagram = useCallback(async (redirect = "/dashboard") => {
    const safeRedirect = safeInternalRedirect(redirect);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`
        : undefined;

    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo,
        scopes: "email,public_profile",
      },
    });

    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, configured, signIn, signUp, signInWithInstagram, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
