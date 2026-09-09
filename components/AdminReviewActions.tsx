"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminReviewActions({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    await supabase.from("events").update({ status: "published", pending_review: false }).eq("id", eventId);
    setLoading(false);
    router.refresh();
  }

  async function reject() {
    setLoading(true);
    await supabase.from("events").update({ status: "cancelled", pending_review: false }).eq("id", eventId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <button onClick={approve} disabled={loading} className="btn-primary !py-2 !text-[13px]">Approve</button>
      <button onClick={reject} disabled={loading} className="btn-ghost !py-2 !text-[13px]">Reject</button>
    </div>
  );
}