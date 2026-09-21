"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPayoutOverride({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function release() {
    setLoading(true);
    await fetch("/api/admin/payouts/release-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId })
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={release} disabled={loading} className="btn-primary !py-2 !text-[13px] shrink-0">
      {loading ? "Releasing..." : "Release anyway"}
    </button>
  );
}