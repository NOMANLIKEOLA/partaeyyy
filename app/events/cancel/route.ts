import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { processRefund } from "@/lib/refunds";

export const maxDuration = 60;

const MAX_REFUNDS_PER_REQUEST = 25;
const BATCH_SIZE = 5;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { eventId } = await req.json();
  if (!eventId) {
    return NextResponse.json({ error: "Missing event." }, { status: 400 });
  }

  const admin = createServiceClient();
  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  const { data: event } = await admin
    .from("events")
    .select("id, organizer_id, status, event_date")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.organizer_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  // These guards only apply to a first cancellation. Re-running on an
  // already-cancelled event just finishes any refunds that are left.
  if (event.status !== "cancelled") {
    const today = new Date().toISOString().slice(0, 10);
    if (!isAdmin && event.event_date < today) {
      return NextResponse.json(
        { error: "This event has already happened, so it can't be cancelled here. Contact support." },
        { status: 400 }
      );
    }

    // Once payout money has moved to the organizer it can't be pulled back
    // by refunding buyers, so cancelling is blocked at that point.
    const { count: payoutsStarted } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "paid")
      .gt("amount", 0)
      .or("payout_status.in.(main_released,released),main_payout_id.not.is.null,reserve_payout_id.not.is.null");

    if ((payoutsStarted ?? 0) > 0) {
      return NextResponse.json(
        { error: "Payouts for this event have already started, so it can't be cancelled here. Contact support." },
        { status: 409 }
      );
    }

    // Cancel first: from this moment nothing new can be bought, and any
    // checkout still finishing is refunded by finalize_checkout.
    const { error: cancelError } = await admin
      .from("events")
      .update({ status: "cancelled", pending_review: false })
      .eq("id", eventId);
    if (cancelError) {
      return NextResponse.json({ error: "Couldn't cancel the event. Try again." }, { status: 500 });
    }
  }

  // Void every ticket and queue every completed purchase for a refund.
  // Queuing first means a crash from here on is finished by the daily retry.
  await admin.from("tickets").update({ status: "void" }).eq("event_id", eventId).eq("status", "valid");
  await admin.from("checkouts").update({ status: "needs_refund" }).eq("event_id", eventId).eq("status", "completed");

  const { data: queued } = await admin
    .from("checkouts")
    .select("reference")
    .eq("event_id", eventId)
    .eq("status", "needs_refund")
    .order("created_at", { ascending: true });

  const references = (queued ?? []).map((c: { reference: string }) => c.reference);
  const batch = references.slice(0, MAX_REFUNDS_PER_REQUEST);

  let refunded = 0;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const results = await Promise.all(batch.slice(i, i + BATCH_SIZE).map((ref: string) => processRefund(ref)));
    refunded += results.filter((r) => r === "refunded").length;
  }

  const remaining = references.length - refunded;
  let message: string;
  if (references.length === 0) {
    message = "Event cancelled. There were no buyers to refund.";
  } else if (remaining === 0) {
    message = `Event cancelled. ${refunded} payment${refunded === 1 ? "" : "s"} refunded.`;
  } else {
    message = `Event cancelled. ${refunded} refunded so far; ${remaining} still processing and will be retried automatically.`;
  }

  return NextResponse.json({ ok: true, message, refunded, remaining });
}