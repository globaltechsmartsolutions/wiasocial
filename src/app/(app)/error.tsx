"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AppError({
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
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="text-xl font-black text-foreground">Error inesperado</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        No se pudo cargar esta sección. Por favor, inténtalo de nuevo.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted">ID: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg bg-lime/10 px-4 py-2 text-sm font-medium text-lime hover:bg-lime/20 transition-colors"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
