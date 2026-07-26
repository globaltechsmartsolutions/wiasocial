"use client";

import { useState } from "react";
import { Zap, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/update-password`,
    });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-lime">
            <Zap className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="mt-2 text-sm text-muted">
            Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-lime/30 bg-lime/5 p-6 text-center">
            <p className="font-semibold text-lime">Email enviado</p>
            <p className="mt-2 text-sm text-muted">
              Revisa tu bandeja de entrada y sigue las instrucciones del email.
            </p>
            <Link href="/login" className="mt-4 inline-flex items-center gap-2 text-sm text-lime hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar enlace de recuperación
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1 text-sm text-muted hover:text-lime"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
