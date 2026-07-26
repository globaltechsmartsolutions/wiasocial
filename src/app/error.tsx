"use client";

import { useEffect } from "react";
import { Zap, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-black text-foreground">Algo salió mal</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Se ha producido un error inesperado. Puedes intentar recargar la página o volver al inicio.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg gradient-lime px-4 py-2 text-sm font-bold text-black hover:opacity-90 transition-opacity"
        >
          <Zap className="h-4 w-4" />
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
