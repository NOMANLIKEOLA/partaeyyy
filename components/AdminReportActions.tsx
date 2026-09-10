"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: "reviewed" | "dismissed") {
    setLoading(true);
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status })
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={() => setStatus("reviewed")} disabled={loading} className="btn-primary !py-2 !text-[13px]">
        Mark reviewed
      </button>
      <button onClick={() => setStatus("dismissed")} disabled={loading} className="btn-ghost !py-2 !text-[13px]">
        Dismiss
      </button>
    </div>
  );
}