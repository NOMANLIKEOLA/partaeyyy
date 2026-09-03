"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CancelEventButton({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    await supabase.from("events").update({ status: "cancelled" }).eq("id", eventId);
    setLoading(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={handleCancel} disabled={loading} className="text-[12.5px] text-coral underline">
          {loading ? "Cancelling..." : "Confirm cancel"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-[12.5px] text-paperDim">
          Never mind
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn-ghost">
      Cancel
    </button>
  );
}