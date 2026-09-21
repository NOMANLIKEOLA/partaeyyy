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
  const minCheckinRate = Number(process.env.PARTAEY_MIN_CHECKIN_RATE ?? "20");

  const mainCutoff = new Date();
  mainCutoff.setDate(mainCutoff.getDate() - holdbackDays);
  const mainCutoffStr = mainCutoff.toISOString().slice(0, 10);

  const reserveCutoff = new Date();
  reserveCutoff.setDate(reserveCutoff.getDate() - reserveDays);
  const reserveCutoffStr = reserveCutoff.toISOString().slice(0, 10);

  const errors: string[] = [];
  const flagged: string[] = [];
  let mainReleased = 0;
  let reserveReleased = 0;

  // ---------- Stage 1: main release, gated by check-in rate per event ----------
  const { data: heldOrders } = await admin
    .from("orders")
    .select("id, release_amount, event_id, events!inner(event_date, status, organizer_id)")
    .eq("status", "paid")
    .eq("payout_status", "held")
    .lte("events.event_date", mainCutoffStr)
    .neq("events.status", "cancelled");

  if (heldOrders && heldOrders.length > 0) {
    const byEvent = new Map<string, { orderIds: string[]; total: number; organizerId: string }>();
    for (const o of heldOrders as any[]) {
      const entry: { orderIds: string[]; total: number; organizerId: string } =
        byEvent.get(o.event_id) ?? { orderIds: [], total: 0, organizerId: o.events.organizer_id };
      entry.orderIds.push(o.id);
      entry.total += Number(o.release_amount ?? 0);
      byEvent.set(o.event_id, entry);
    }

    const byOrganizer = new Map<string, { orderIds: string[]; total: number }>();

    for (const [eventId, eventEntry] of byEvent) {
      const { count: totalTickets } = await admin
        .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId);
      const { count: checkedIn } = await admin
        .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "used");

      const rate = totalTickets && totalTickets > 0 ? ((checkedIn ?? 0) / totalTickets) * 100 : null;

      if (rate !== null && rate < minCheckinRate) {
        // Low turnout on a paid event — hold for manual review instead of
        // auto-releasing. A heuristic, not proof, so it goes to a human.
        await admin
          .from("events")
          .update({
            payout_flagged: true,
            payout_flag_reason: `Only ${rate.toFixed(0)}% checked in (${checkedIn ?? 0} of ${totalTickets})`
          })
          .eq("id", eventId);
        flagged.push(`Event ${eventId}: ${rate.toFixed(0)}% check-in — held for review.`);
        continue;
      }

      const orgEntry = byOrganizer.get(eventEntry.organizerId) ?? { orderIds: [], total: 0 };
      orgEntry.orderIds.push(...eventEntry.orderIds);
      orgEntry.total += eventEntry.total;
      byOrganizer.set(eventEntry.organizerId, orgEntry);
    }

    for (const [organizerId, entry] of byOrganizer) {
      const { data: organizer } = await admin
        .from("users").select("paystack_recipient_code, full_name").eq("id", organizerId).single();

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

  // ---------- Stage 2: reserve release (unchanged) ----------
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
      const entry: { orderIds: string[]; total: number } =
        byOrganizer.get(organizerId) ?? { orderIds: [], total: 0 };
      entry.orderIds.push(o.id);
      entry.total += Number(o.reserve_amount ?? 0);
      byOrganizer.set(organizerId, entry);
    }

    for (const [organizerId, entry] of byOrganizer) {
      const { data: organizer } = await admin
        .from("users").select("paystack_recipient_code, full_name").eq("id", organizerId).single();

      if (!organizer?.paystack_recipient_code || entry.total <= 0) {
        errors.push(`Reserve release: ${organizer?.full_name ?? organizerId} has no payout account — ${entry.orderIds.length} order(s) stuck.`);
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

  return NextResponse.json({ mainReleased, reserveReleased, flagged, errors });
}