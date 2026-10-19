"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAlertActions({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setLoading(true);
    await fetch("/api/admin/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId })
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={resolve} disabled={loading} className="btn-ghost shrink-0">
      {loading ? "Resolving..." : "Mark resolved"}
    </button>
  );
}