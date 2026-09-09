import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

async function transferToOrganizer(recipientCode: string, amountNaira: number) {
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(amountNaira * 100),
      recipient: recipientCode,
      reason: "Partaey ticket sales payout"
    })
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const holdbackDays = Number(process.env.PARTAEY_HOLDBACK_DAYS ?? "3");
  const reserveDays = Number(process.env.PARTAEY_RESERVE_DAYS ?? "14");

  const mainCutoff = new Date();
  mainCutoff.setDate(mainCutoff.getDate() - holdbackDays);
  const mainCutoffStr = mainCutoff.toISOString().slice(0, 10);

  const reserveCutoff = new Date();
  reserveCutoff.setDate(reserveCutoff.getDate() - reserveDays);
  const reserveCutoffStr = reserveCutoff.toISOString().slice(0, 10);

  const errors: string[] = [];
  let mainReleased = 0;
  let reserveReleased = 0;

  // ---------- Stage 1: main release ----------
  const { data: heldOrders } = await admin
    .from("orders")
    .select("id, release_amount, events!inner(event_date, status, organizer_id)")
    .eq("status", "paid")
    .eq("payout_status", "held")
    .lte("events.event_date", mainCutoffStr)
    .neq("events.status", "cancelled");

  if (heldOrders && heldOrders.length > 0) {
    const byOrganizer = new Map<string, { orderIds: string[]; total: number }>();
    for (const o of heldOrders as any[]) {
      const organizerId = o.events.organizer_id;
      const entry = byOrganizer.get(organizerId) ?? { orderIds: [], total: 0 };
      entry.orderIds.push(o.id);
      entry.total += Number(o.release_amount ?? 0);
      byOrganizer.set(organizerId, entry);
    }

    for (const [organizerId, entry] of byOrganizer) {
      const { data: organizer } = await admin
        .from("users")
        .select("paystack_recipient_code, full_name")
        .eq("id", organizerId)
        .single();

      if (!organizer?.paystack_recipient_code || entry.total <= 0) {
        errors.push(`Main release: ${organizer?.full_name ?? organizerId} has no payout account — ${entry.orderIds.length} order(s) left held.`);
        continue;
      }

      const transferJson = await transferToOrganizer(organizer.paystack_recipient_code, entry.total);
      if (!transferJson.status) {
        errors.push(`Main release to ${organizer.full_name ?? organizerId} failed: ${transferJson.message}`);
        continue;
      }

      await admin
        .from("orders")
        .update({ payout_status: "main_released", main_released_at: new Date().toISOString() })
        .in("id", entry.orderIds);

      mainReleased += entry.orderIds.length;
    }
  }

  // ---------- Stage 2: reserve release ----------
  const { data: reserveOrders } = await admin
    .from("orders")
    .select("id, reserve_amount, events!inner(event_date, status, organizer_id)")
    .eq("status", "paid")
    .eq("payout_status", "main_released")
    .lte("events.event_date", reserveCutoffStr)
    .neq("events.status", "cancelled");

  if (reserveOrders && reserveOrders.length > 0) {
    const byOrganizer = new Map<string, { orderIds: string[]; total: number }>();
    for (const o of reserveOrders as any[]) {
      const organizerId = o.events.organizer_id;
      const entry = byOrganizer.get(organizerId) ?? { orderIds: [], total: 0 };
      entry.orderIds.push(o.id);
      entry.total += Number(o.reserve_amount ?? 0);
      byOrganizer.set(organizerId, entry);
    }

    for (const [organizerId, entry] of byOrganizer) {
      const { data: organizer } = await admin
        .from("users")
        .select("paystack_recipient_code, full_name")
        .eq("id", organizerId)
        .single();

      if (!organizer?.paystack_recipient_code || entry.total <= 0) {
        errors.push(`Reserve release: ${organizer?.full_name ?? organizerId} has no payout account — ${entry.orderIds.length} order(s) stuck at main_released.`);
        continue;
      }

      const transferJson = await transferToOrganizer(organizer.paystack_recipient_code, entry.total);
      if (!transferJson.status) {
        errors.push(`Reserve release to ${organizer.full_name ?? organizerId} failed: ${transferJson.message}`);
        continue;
      }

      await admin
        .from("orders")
        .update({ payout_status: "released", reserve_released_at: new Date().toISOString() })
        .in("id", entry.orderIds);

      reserveReleased += entry.orderIds.length;
    }
  }

  return NextResponse.json({ mainReleased, reserveReleased, errors });
}