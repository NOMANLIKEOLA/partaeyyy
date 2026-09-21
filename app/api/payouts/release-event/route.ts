import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await req.json();
  const admin = createServiceClient();

  const { data: event } = await admin.from("events").select("organizer_id").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: organizer } = await admin
    .from("users").select("paystack_recipient_code, full_name").eq("id", event.organizer_id).single();

  if (!organizer?.paystack_recipient_code) {
    return NextResponse.json({ error: "Organizer has no payout account connected" }, { status: 400 });
  }

  const { data: heldOrders } = await admin
    .from("orders").select("id, release_amount").eq("event_id", eventId).eq("status", "paid").eq("payout_status", "held");

  const total = (heldOrders ?? []).reduce((s: number, o: any) => s + Number(o.release_amount ?? 0), 0);

  if (total > 0) {
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(total * 100),
        recipient: organizer.paystack_recipient_code,
        reason: "Partaey ticket sales payout (admin override)"
      })
    });
    const transferJson = await transferRes.json();
    if (!transferJson.status) {
      return NextResponse.json({ error: transferJson.message }, { status: 400 });
    }

    await admin
      .from("orders")
      .update({ payout_status: "main_released", main_released_at: new Date().toISOString() })
      .in("id", (heldOrders ?? []).map((o: any) => o.id));
  }

  await admin.from("events").update({ payout_flagged: false, payout_flag_reason: null }).eq("id", eventId);

  return NextResponse.json({ ok: true });
}