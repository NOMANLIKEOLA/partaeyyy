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

  const total = ticketTypes.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price, 0);
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

  const ageBlocked = is18Plus && userId && (viewerAge === null || viewerAge < 18);

  function setQuantity(id: string, delta: number, max: number) {
    setQty((prev) => {
      const next = Math.max(0, Math.min(max, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  function startCheckout() {
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

    const chosen = ticketTypes.find((t) => (qty[t.id] ?? 0) > 0);
    if (!chosen || !window.PaystackPop) return;

    setPaying(true);

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: Math.round(total * 100),
      currency: "NGN",
      // No subaccount split anymore — payment goes fully to the platform
      // balance and is released to the organizer later (see /api/payouts/release),
      // after a holdback window and reserve period.
      metadata: {
        event_id: eventId,
        ticket_type_id: chosen.id,
        quantity: qty[chosen.id]
      },
      callback: (response: { reference: string }) => {
        fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: response.reference,
            eventId,
            ticketTypeId: chosen.id,
            quantity: qty[chosen.id],
            amount: total
          })
        }).then((res) => {
          setPaying(false);
          if (res.ok) {
            window.location.href = "/dashboard?paid=1";
          } else {
            setError("Payment received but confirmation failed — contact support with your reference.");
          }
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
                    <div className="text-[11.5px] text-paperDim mt-0.5">{left} left</div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-[15px]">
                      {t.price === 0 ? "Free" : `₦${t.price.toLocaleString()}`}
                    </span>
                    <div className="flex items-center gap-2.5 ml-3">
                      <button
                        className="w-6 h-6 rounded-full border border-hairline text-sm"
                        onClick={() => setQuantity(t.id, -1, left)}
                        disabled={!!ageBlocked}
                      >
                        &minus;
                      </button>
                      <span className="w-4 text-center text-sm">{qty[t.id] ?? 0}</span>
                      <button
                        className="w-6 h-6 rounded-full border border-hairline text-sm"
                        onClick={() => setQuantity(t.id, 1, left)}
                        disabled={!!ageBlocked}
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
                  {paying ? "Opening Paystack..." : `Pay ₦${total.toLocaleString()} with Paystack`}
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