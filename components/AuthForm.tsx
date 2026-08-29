"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? "Signup failed.");
      return;
    }

    // The trigger already created a bare row in `users` — fill in the rest.
    // This only succeeds if the session is active (i.e. email confirmation
    // is off, or the user is auto-confirmed). If you have email confirmation
    // ON, this update will silently fail until they confirm and log in —
    // in that case, move this into a "complete your profile" step post-login.
    const { error: profileError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        phone,
        date_of_birth: dob || null
      })
      .eq("id", data.user.id);

    setLoading(false);

    if (profileError) {
      setError(`Account created, but profile details didn't save: ${profileError.message}`);
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

      {mode === "signup" && (
        <>
          <input className="field-input" type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="field-input" type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div>
            <label className="block text-[13px] text-paperDim mb-2">Date of birth</label>
            <input className="field-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
        </>
      )}

      <input className="field-input" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {error && <div className="text-[13px] text-coral">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
      </button>
    </form>
  );
}