import { Zap, Database, Key, ExternalLink } from "lucide-react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default function SetupPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-lime">
            <Zap className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuración inicial</h1>
            <p className="text-muted">Conecta un Supabase de desarrollo para usar los flujos con datos</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-lime" />
              <h2 className="font-semibold text-foreground">1. Crear proyecto Supabase</h2>
            </div>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
              <li>
                Ve a{" "}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline inline-flex items-center gap-1">
                  supabase.com <ExternalLink className="h-3 w-3" />
                </a>{" "}
                y crea un proyecto gratis
              </li>
              <li>En Settings → API, copia la URL y la clave pública del proyecto</li>
              <li>Para preparar la base completa en desarrollo o staging, ejecuta <code className="text-lime">npm run migrate:all</code></li>
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-lime" />
              <h2 className="font-semibold text-foreground">2. OpenAI (opcional)</h2>
            </div>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
              <li>
                Ve a{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline inline-flex items-center gap-1">
                  platform.openai.com <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Crea una API key únicamente si vas a probar las funciones de IA</li>
            </ol>
          </div>

          <div className="rounded-xl border border-lime/20 bg-lime/5 p-6">
            <h2 className="font-semibold text-foreground mb-3">3. Editar .env.local</h2>
            <pre className="rounded-lg bg-surface-elevated p-4 text-xs text-muted overflow-x-auto">{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
            <p className="mt-3 text-sm text-muted">No subas <code className="text-lime">.env.local</code> a Git. Reinicia con <code className="text-lime">npm run dev:local</code> después de cambiarlo.</p>
          </div>

          <Link href="/login" className="block text-center text-sm text-lime hover:underline">
            Ya configuré todo → Ir al login
          </Link>
        </div>
      </div>
    </div>
  );
}
