"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIGERIA_STATES } from "@/lib/nigeria";

type Initial = { fullName: string; phone: string; state: string; dob: string };

export default function ProfileForm({ userId, initial }: { userId: string; initial: Initial }) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [state, setState] = useState(initial.state);
  const [dob, setDob] = useState(initial.dob);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        phone,
        state,
        date_of_birth: dob || null
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] text-paperDim mb-2">Full name</label>
        <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Phone number</label>
        <input className="field-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080X XXX XXXX" />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">State</label>
        <select className="field-input" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Select a state</option>
          {NIGERIA_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Date of birth</label>
        <input className="field-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </div>

      {error && <div className="text-[13px] text-coral">{error}</div>}
      {saved && !error && <div className="text-[13px] text-teal">Saved.</div>}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}