import { createServiceClient } from "@/lib/supabase/server";
import { raiseAlert } from "@/lib/alerts";

const MAX_ATTEMPTS = 5;
const LIVE_REFUND_STATES = ["pending", "processing", "processed"];

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json"
});

// Paystack refunds are asynchronous, and our request can succeed while the
// response is lost. Before creating a refund, ask Paystack whether one is
// already in flight for this transaction, so a retry never double-refunds.
async function hasLiveRefund(reference: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.paystack.co/refund?reference=${encodeURIComponent(reference)}`, {
      headers: authHeaders()
    });
    const json = await res.json();
    return Array.isArray(json.data) && json.data.some((r: any) => LIVE_REFUND_STATES.includes(r.status));
  } catch {
    return false;
  }
}

async function completeRefund(reference: string) {
  const admin = createServiceClient();
  await admin.rpc("complete_refund", { p_reference: reference });
}

export type RefundResult = "refunded" | "needs_refund" | "refund_failed" | "not_found" | string;

// Expects the checkout to be in 'needs_refund'. Callers set that status
// first, which means a crash anywhere after that point is picked up by retryRefunds.
export async function processRefund(reference: string): Promise<RefundResult> {
  const admin = createServiceClient();

  const { data: checkout } = await admin
    .from("checkouts")
    .select("amount, status, event_id, refund_attempts")
    .eq("reference", reference)
    .maybeSingle();

  if (!checkout) return "not_found";
  if (checkout.status !== "needs_refund") return checkout.status;

  // Free tickets have nothing to send back; an existing live refund means done.
  if (Number(checkout.amount) === 0 || (await hasLiveRefund(reference))) {
    await completeRefund(reference);
    return "refunded";
  }

  let errorMessage = "Paystack refund request failed";
  try {
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ transaction: reference })
    });
    const json = await res.json();
    if (json.status) {
      await completeRefund(reference);
      return "refunded";
    }
    errorMessage = json.message ?? errorMessage;
  } catch {
    errorMessage = "Network error while contacting Paystack";
  }

  const attempts = (checkout.refund_attempts ?? 0) + 1;
  const giveUp = attempts >= MAX_ATTEMPTS;

  await admin
    .from("checkouts")
    .update({
      refund_attempts: attempts,
      last_refund_error: errorMessage,
      status: giveUp ? "refund_failed" : "needs_refund"
    })
    .eq("reference", reference)
    .eq("status", "needs_refund");

  // One alert per event, however many of its refunds are failing.
  await raiseAlert(
    "refund_failed",
    `A refund of ₦${Number(checkout.amount).toLocaleString()} (reference ${reference}) failed: ${errorMessage}.` +
      (giveUp
        ? ` It has failed ${MAX_ATTEMPTS} times and needs a manual refund in the Paystack dashboard.`
        : " It will retry automatically."),
    `refund:${checkout.event_id}`
  );

  return giveUp ? "refund_failed" : "needs_refund";
}

// Picks up refunds that failed earlier or were interrupted mid-way.
export async function retryRefunds(limit = 50): Promise<number> {
  const admin = createServiceClient();
  const { data: rows } = await admin
    .from("checkouts")
    .select("reference")
    .eq("status", "needs_refund")
    .order("created_at", { ascending: true })
    .limit(limit);

  let refunded = 0;
  for (const row of rows ?? []) {
    if ((await processRefund(row.reference)) === "refunded") refunded++;
  }
  return refunded;
}