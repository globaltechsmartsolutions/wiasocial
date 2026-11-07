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
            <h1 className="text-2xl font-bold text-foreground">Initial setup</h1>
            <p className="text-muted">Connect a development Supabase project to use data-backed workflows</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-lime" />
              <h2 className="font-semibold text-foreground">1. Create a Supabase project</h2>
            </div>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
              <li>
                Go to{" "}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline inline-flex items-center gap-1">
                  supabase.com <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and create a free project
              </li>
              <li>In Settings → API, copy the project URL and public anon key</li>
              <li>To prepare the full database in development or staging, run <code className="text-lime">npm run migrate:all</code></li>
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-lime" />
              <h2 className="font-semibold text-foreground">2. OpenAI (optional)</h2>
            </div>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
              <li>
                Go to{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-lime hover:underline inline-flex items-center gap-1">
                  platform.openai.com <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Create an API key only if you plan to test AI features</li>
            </ol>
          </div>

          <div className="rounded-xl border border-lime/20 bg-lime/5 p-6">
            <h2 className="font-semibold text-foreground mb-3">3. Edit .env.local</h2>
            <pre className="rounded-lg bg-surface-elevated p-4 text-xs text-muted overflow-x-auto">{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000`}</pre>
            <p className="mt-3 text-sm text-muted">Never commit <code className="text-lime">.env.local</code> to Git. Restart with <code className="text-lime">npm run dev:local</code> after changing it.</p>
          </div>

          <Link href="/login" className="block text-center text-sm text-lime hover:underline">
            Setup complete → Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
