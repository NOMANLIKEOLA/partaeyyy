import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { finalizeCheckout } from "@/lib/checkout";
import { handleTransferWebhook } from "@/lib/payouts";
import { raiseAlert } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const admin = createServiceClient();

  try {
    switch (payload.event) {
      case "charge.success": {
        const { reference, amount } = payload.data;

        const { data: checkout } = await admin
          .from("checkouts")
          .select("amount, status")
          .eq("reference", reference)
          .maybeSingle();

        // Not one of ours, already handled, or the amount doesn't match what
        // we priced: acknowledge and move on. Retrying wouldn't change it.
        if (!checkout || checkout.status !== "pending") break;
        if (amount !== Math.round(Number(checkout.amount) * 100)) break;

        await finalizeCheckout(reference);
        break;
      }

      case "transfer.success":
        await handleTransferWebhook("success", payload.data);
        break;

      case "transfer.failed":
        await handleTransferWebhook("failed", payload.data);
        break;

      case "transfer.reversed":
        await handleTransferWebhook("reversed", payload.data);
        break;

      case "refund.failed": {
        // Paystack accepted the refund, then couldn't deliver it. The money
        // is back in your balance, so this needs a person.
        const reference = payload.data?.transaction_reference ?? payload.data?.reference;
        if (!reference) break;

        const { data: checkout } = await admin
          .from("checkouts")
          .update({
            status: "refund_failed",
            last_refund_error: "Paystack reported the refund failed; the funds returned to your balance."
          })
          .eq("reference", reference)
          .in("status", ["refunded", "needs_refund"])
          .select("event_id, amount")
          .maybeSingle();

        if (checkout) {
          await raiseAlert(
            "refund_failed",
            `Paystack reported that the refund for ${reference} (₦${Number(checkout.amount).toLocaleString()}) failed. The money is back in your balance and the buyer still needs refunding manually.`,
            `refund:${checkout.event_id}`
          );
        }
        break;
      }
    }
  } catch {
    // A real failure (e.g. a database hiccup): a non-200 makes Paystack retry.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}