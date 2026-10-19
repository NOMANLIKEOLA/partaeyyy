import { createServiceClient } from "@/lib/supabase/server";
import { processRefund } from "@/lib/refunds";

// Finalizes a paid checkout. Safe to call more than once for the same
// reference (verify and the webhook both call it), because the database
// function is idempotent.
export async function finalizeCheckout(reference: string): Promise<string> {
  const admin = createServiceClient();
  const feePercent = Number(process.env.PARTAEY_PLATFORM_FEE_PERCENT ?? "5");
  const reservePercent = Number(process.env.PARTAEY_RESERVE_PERCENT ?? "15");

  const { data, error } = await admin.rpc("finalize_checkout", {
    p_reference: reference,
    p_fee_percent: feePercent,
    p_reserve_percent: reservePercent
  });

  if (error) throw new Error(error.message);

  // Sold out, or the event was cancelled, between "prepare" and payment
  // completing. The money has already moved, so refund it.
  if (data === "insufficient_stock" || data === "event_unavailable") {
    await admin
      .from("checkouts")
      .update({ status: "needs_refund" })
      .eq("reference", reference)
      .eq("status", "pending");
    return processRefund(reference);
  }

  return data as string;
}