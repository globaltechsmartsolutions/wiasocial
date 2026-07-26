"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Instagram, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { safeInternalRedirect } from "@/lib/safe-redirect";
import Link from "next/link";

export default function LoginForm() {
  const { signIn, signUp, signInWithInstagram, configured, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeInternalRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  if (!configured) {
    router.replace("/setup");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    if (result.error) { setError(result.error); setSubmitting(false); return; }
    if (mode === "signup") { setSuccess("Cuenta creada. Revisa tu email o inicia sesión."); setSubmitting(false); return; }
    router.replace(redirect);
  };

  const handleInstagramLogin = async () => {
    setError("");
    setSuccess("");
    setOauthSubmitting(true);
    const result = await signInWithInstagram(redirect);
    if (result.error) {
      setError(result.error);
      setOauthSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-lime"><Zap className="h-7 w-7 text-black" /></div>
          <h1 className="text-2xl font-bold">WIA Instagram Growth OS</h1>
          <p className="mt-2 text-muted">Datos reales · IA real · Crecimiento legal</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <Button type="button" variant="secondary" onClick={handleInstagramLogin} disabled={oauthSubmitting || submitting} className="w-full">
            {oauthSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
            Continuar con Instagram
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted">o con email</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input id="password" label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-lime">{success}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-sm text-muted hover:text-lime">
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
          {mode === "login" && (
            <Link href="/login/reset" className="block w-full text-center text-xs text-muted hover:text-lime">
              ¿Olvidaste tu contraseña?
            </Link>
          )}
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          Al registrarte aceptas nuestros{" "}
          <Link href="/terms" className="hover:text-lime underline">Términos de Servicio</Link>
          {" "}y{" "}
          <Link href="/privacy" className="hover:text-lime underline">Política de Privacidad</Link>
        </p>
      </div>
    </div>
  );
}
