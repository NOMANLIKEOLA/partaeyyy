"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-[380px] mx-auto py-16">
      <h1 className="font-display text-2xl font-bold mb-1">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>
      <p className="text-paperDim text-sm mb-6">
        {mode === "login" ? "Welcome back to Partaey." : "Join Partaey to save events, buy tickets, and list your own."}
      </p>
      <input
        className="field-input"
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="text-[13px] text-coral">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
      </button>
    </form>
  );
}