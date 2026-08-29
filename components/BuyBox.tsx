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
  organizerSubaccountCode
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
  userId: string | null;
  userEmail: string | null;
  organizerSubaccountCode: string | null;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = ticketTypes.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price, 0);
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

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
      ...(organizerSubaccountCode ? { subaccount: organizerSubaccountCode } : {}),
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

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <div className="bg-panel border border-hairline rounded-card p-5.5 h-fit">
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
                      >
                        &minus;
                      </button>
                      <span className="w-4 text-center text-sm">{qty[t.id] ?? 0}</span>
                      <button
                        className="w-6 h-6 rounded-full border border-hairline text-sm"
                        onClick={() => setQuantity(t.id, 1, left)}
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
                  disabled={paying}
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