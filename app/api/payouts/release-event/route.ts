import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { payOrganizer } from "@/lib/payouts";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await req.json();
  const admin = createServiceClient();

  const { data: event } = await admin
    .from("events")
    .select("organizer_id, status")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status === "cancelled") {
    return NextResponse.json({ error: "This event is cancelled. Buyers are refunded, not paid out." }, { status: 400 });
  }

  const { data: held } = await admin
    .from("orders")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "paid")
    .eq("payout_status", "held")
    .is("main_payout_id", null)
    .gt("release_amount", 0);

  if (held && held.length > 0) {
    const result = await payOrganizer({
      organizerId: event.organizer_id,
      stage: "main",
      orderIds: held.map((o: { id: string }) => o.id)
    });

    if (result.status === "failed" || result.status === "skipped") {
      return NextResponse.json({ error: result.message ?? "Couldn't send the payout." }, { status: 400 });
    }
  }

  await admin.from("events").update({ payout_flagged: false, payout_flag_reason: null }).eq("id", eventId);

  return NextResponse.json({ ok: true });
}