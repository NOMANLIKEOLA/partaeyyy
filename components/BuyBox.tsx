"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import type { TicketType } from "@/lib/types";

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

const MAX_PER_TIER = 10;

export default function BuyBox({
  eventId,
  eventTitle,
  ticketTypes,
  userId,
  userEmail,
  is18Plus,
  viewerAge,
  eventCancelled
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
  userId: string | null;
  userEmail: string | null;
  is18Plus: boolean;
  viewerAge: number | null;
  eventCancelled: boolean;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This total is a display estimate only. The server prices the real
  // checkout from the database and returns the amount to charge.
  const total = ticketTypes.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price, 0);
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

  const ageBlocked = is18Plus && userId && (viewerAge === null || viewerAge < 18);

  function setQuantity(id: string, delta: number, left: number) {
    setQty((prev) => {
      const max = Math.min(left, MAX_PER_TIER);
      const next = Math.max(0, Math.min(max, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  async function startCheckout() {
    if (!userId || !userEmail) {
      setError("Log in to buy tickets.");
      return;
    }
    if (is18Plus && viewerAge === null) {
      setError("This event is 18+. Add your date of birth in your profile before buying a ticket.");
      return;
    }
    if (is18Plus && viewerAge! < 18) {
      setError("This event is 18+. You must be 18 or older to attend.");
      return;
    }
    if (totalQty === 0) {
      setError("Select at least one ticket.");
      return;
    }
    setError(null);
    setPaying(true);

    const items = ticketTypes
      .filter((t) => (qty[t.id] ?? 0) > 0)
      .map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id] }));

    let data: any;
    try {
      const res = await fetch("/api/checkout/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items })
      });
      data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start checkout.");
        setPaying(false);
        return;
      }
    } catch {
      setError("Network error. Try again.");
      setPaying(false);
      return;
    }

    // Free tickets are issued by the server immediately.
    if (data.free) {
      window.location.href = "/tickets?claimed=1";
      return;
    }

    if (!window.PaystackPop) {
      setError("The payment window is still loading. Try again in a moment.");
      setPaying(false);
      return;
    }

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: data.email,
      amount: Math.round(data.amount * 100),
      currency: "NGN",
      ref: data.reference,
      callback: (response: { reference: string }) => {
        fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference })
        }).then(async (res) => {
          if (res.ok) {
            window.location.href = "/tickets?paid=1";
            return;
          }
          const body = await res.json().catch(() => ({}));
          setPaying(false);
          setError(
            body.error ??
              `Payment received but confirmation failed. Contact support with reference ${response.reference}.`
          );
        });
      },
      onClose: () => setPaying(false)
    });

    handler.openIframe();
  }

  if (eventCancelled) {
    return (
      <div className="bg-panel border border-hairline rounded-card p-5.5 h-fit">
        <div className="text-[13px] text-coral font-medium">This event has been cancelled</div>
        <p className="text-[12.5px] text-paperDim mt-2">
          The organizer cancelled this event. If you already bought a ticket, contact them directly.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <div className="bg-panel border border-hairline rounded-card p-5.5 h-fit">
        {is18Plus && (
          <div className="text-[12px] text-coral mb-3 flex items-center gap-1.5">
            <span>🔞</span> This event is 18+ only
          </div>
        )}

        {ageBlocked && (
          <div className="text-[12.5px] text-coral bg-coral/10 border border-coral/30 rounded-lg p-3 mb-3">
            {viewerAge === null ? (
              <>
                Add your date of birth in your{" "}
                <Link href="/profile" className="underline">profile</Link> to buy a ticket to this 18+ event.
              </>
            ) : (
              "You must be 18 or older to get a ticket to this event."
            )}
          </div>
        )}

        {ticketTypes.length === 0 ? (
          <>
            <div className="text-[13px] text-paperDim mb-2">This is a free event</div>
            <div className="text-sm mb-1">No ticket needed — just show up.</div>
            <div className="text-[12.5px] text-paperDim">Save it below so you don't forget.</div>
          </>
        ) : (
          <>
            <div className="text-[13px] text-paperDim mb-2">Select tickets</div>

            {ticketTypes.map((t) => {
              const left = t.quantity - t.quantity_sold;
              return (
                <div key={t.id} className="flex justify-between items-center py-3.5 border-b border-hairline last:border-b-0">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-[11.5px] text-paperDim mt-0.5">
                      {left > 0 ? `${left} left` : "Sold out"}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-[15px]">
                      {t.price === 0 ? "Free" : `₦${t.price.toLocaleString()}`}
                    </span>
                    <div className="flex items-center gap-2.5 ml-3">
                      <button
                        className="w-6 h-6 rounded-full border border-hairline text-sm"
                        onClick={() => setQuantity(t.id, -1, left)}
                        disabled={!!ageBlocked || left <= 0}
                      >
                        &minus;
                      </button>
                      <span className="w-4 text-center text-sm">{qty[t.id] ?? 0}</span>
                      <button
                        className="w-6 h-6 rounded-full border border-hairline text-sm"
                        onClick={() => setQuantity(t.id, 1, left)}
                        disabled={!!ageBlocked || left <= 0}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {error && <div className="text-[12.5px] text-coral mt-3">{error}</div>}

            {!userId ? (
              <Link href="/login" className="btn-primary w-full text-center block mt-4.5">
                Log in to buy tickets
              </Link>
            ) : (
              <form onSubmit={(e) => e.preventDefault()}>
                <button
                  type="submit"
                  className="btn-primary w-full mt-4.5"
                  disabled={paying || !!ageBlocked}
                  onClick={startCheckout}
                >
                  {paying
                    ? "Please wait..."
                    : totalQty > 0 && total === 0
                      ? "Get free ticket"
                      : `Pay ₦${total.toLocaleString()} with Paystack`}
                </button>
              </form>
            )}

            <div className="text-center text-[11px] text-paperDim mt-2.5">
              Secured payments powered by Paystack
            </div>
          </>
        )}
      </div>
    </>
  );
}