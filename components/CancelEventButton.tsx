"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelEventButton({
  eventId,
  label = "Cancel"
}: {
  eventId: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Couldn't cancel the event.");
        setConfirming(false);
      } else {
        setMessage(data.message);
        setTimeout(() => router.refresh(), 4000);
      }
    } catch {
      setError("Network error. Try again.");
    }

    setLoading(false);
  }

  if (message) {
    return <div className="text-[12.5px] text-teal max-w-[260px]">{message}</div>;
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5 max-w-[260px]">
        <div className="text-[12px] text-paperDim">
          This refunds every buyer in full and can't be undone.
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} disabled={loading} className="text-[12.5px] text-coral underline">
            {loading ? "Cancelling and refunding..." : "Yes, cancel and refund"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={loading} className="text-[12.5px] text-paperDim">
            Never mind
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-[260px]">
      <button onClick={() => setConfirming(true)} className="btn-ghost">
        {label}
      </button>
      {error && <div className="text-[12px] text-coral">{error}</div>}
    </div>
  );
}