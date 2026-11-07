"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-lime">
            <Zap className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold">Create a new password</h1>
          <p className="mt-2 text-sm text-muted">Choose a secure password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <Input
            id="password"
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            id="confirm"
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
