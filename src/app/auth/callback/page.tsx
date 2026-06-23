"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verificando tu cuenta...");

  useEffect(() => {
    const handleAuth = async () => {
      const sb = getSupabase();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("Error al verificar. Inicia sesión manualmente.");
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }
      }

      const { data: { session } } = await sb.auth.getSession();
      router.replace(session ? "/dashboard" : "/login");
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-lime" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
