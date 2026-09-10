"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminReviewActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "approve" | "reject") {
    setLoading(true);
    await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action })
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <button onClick={() => act("approve")} disabled={loading} className="btn-primary !py-2 !text-[13px]">Approve</button>
      <button onClick={() => act("reject")} disabled={loading} className="btn-ghost !py-2 !text-[13px]">Reject</button>
    </div>
  );
}