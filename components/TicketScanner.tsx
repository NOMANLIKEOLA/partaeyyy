"use client";

import { useEffect, useRef, useState } from "react";

export default function TicketScanner({ eventId }: { eventId: string }) {
  const scannerRef = useRef<any>(null);
  const [result, setResult] = useState<{ type: string; message: string } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!active) return;
      const html5Qr = new Html5Qrcode("qr-reader");
      scannerRef.current = html5Qr;

      html5Qr
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          async (decodedText: string) => {
            if (busyRef.current) return;
            busyRef.current = true;
            try {
              const res = await fetch("/api/tickets/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: decodedText, eventId })
              });
              const data = await res.json();
              setResult({ type: data.result, message: data.message });
            } catch {
              setResult({ type: "invalid", message: "Network error — try again." });
            }
            setTimeout(() => {
              setResult(null);
              busyRef.current = false;
            }, 2500);
          },
          () => {}
        )
        .catch(() => {});
    });

    return () => {
      active = false;
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, [eventId]);

  return (
    <div>
      <div id="qr-reader" className="rounded-card overflow-hidden border border-hairline" />
      {result && (
        <div
          className={`mt-4 rounded-card p-4 text-center font-medium ${
            result.type === "valid" ? "bg-teal/20 text-teal" :
            result.type === "already_used" ? "bg-amber/20 text-amber" :
            "bg-coral/20 text-coral"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}