"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!loading && !configured) router.replace("/setup");
  }, [configured, loading, router]);

  if (loading || !configured) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-lime" /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    if (result.error) { setError(result.error); setSubmitting(false); return; }
    if (mode === "signup") { setSuccess("Account created. Check your email or sign in."); setSubmitting(false); return; }
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
          <p className="mt-2 text-muted">Real data · Real AI · Sustainable growth</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <Button type="button" variant="secondary" onClick={handleInstagramLogin} disabled={oauthSubmitting || submitting} className="w-full">
            {oauthSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
            Continue with Instagram
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted">or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-lime">{success}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-sm text-muted hover:text-lime">
            {mode === "login" ? "New to WIA Social? Create an account" : "Already have an account? Sign in"}
          </button>
          {mode === "login" && (
            <Link href="/login/reset" className="block w-full text-center text-xs text-muted hover:text-lime">
              Forgot your password?
            </Link>
          )}
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="hover:text-lime underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:text-lime underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
