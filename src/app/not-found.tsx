"use client";

import Link from "next/link";
import { Zap, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-lime">
          <Zap className="h-5 w-5 text-black" />
        </div>
        <div className="text-left">
          <span className="text-base font-bold text-foreground">WIA</span>
          <span className="block text-[10px] text-muted leading-none">Instagram Growth OS</span>
        </div>
      </Link>

      <div className="relative mb-6">
        <p className="text-[120px] font-black leading-none text-lime/10 select-none">404</p>
        <p className="absolute inset-0 flex items-center justify-center text-6xl font-black text-lime">
          404
        </p>
      </div>

      <h1 className="text-2xl font-bold text-foreground">Página no encontrada</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Esta ruta no existe. Es posible que haya cambiado o que hayas escrito la URL incorrectamente.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard">
          <Button>
            <Home className="h-4 w-4" />
            Ir al Dashboard
          </Button>
        </Link>
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
    </div>
  );
}
