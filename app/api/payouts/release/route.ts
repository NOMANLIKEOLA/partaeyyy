import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { payOrganizer, reconcilePendingPayouts, type PayoutResult } from "@/lib/payouts";
import { retryRefunds } from "@/lib/refunds";
import { raiseAlert } from "@/lib/alerts";

export const maxDuration = 60;

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

  // Housekeeping first: settle anything left hanging, retry failed refunds.
  await reconcilePendingPayouts();
  const refundsCompleted = await retryRefunds();

  const summary = {
    refundsCompleted,
    main: { success: 0, pending: 0, failed: 0, skipped: 0 },
    reserve: { success: 0, pending: 0, failed: 0, skipped: 0 },
    flagged: [] as string[]
  };

  const tally = (stage: "main" | "reserve", r: PayoutResult) => {
    summary[stage][r.status]++;
  };

  // ---------- Stage 1: main release, gated by check-in rate per event ----------
  const { data: heldOrders } = await admin
    .from("orders")
    .select("id, event_id, events!inner(event_date, status, organizer_id)")
    .eq("status", "paid")
    .eq("payout_status", "held")
    .is("main_payout_id", null)
    .gt("release_amount", 0)
    .lte("events.event_date", mainCutoffStr)
    .neq("events.status", "cancelled");

  const byEvent = new Map<string, { organizerId: string; orderIds: string[] }>();
  for (const o of (heldOrders ?? []) as any[]) {
    const ev = Array.isArray(o.events) ? o.events[0] : o.events;
    const entry: { organizerId: string; orderIds: string[] } = byEvent.get(o.event_id) ?? {
      organizerId: ev.organizer_id,
      orderIds: [] as string[],
    };
    entry.orderIds.push(o.id as string);
    byEvent.set(o.event_id, entry);
  }

  const mainByOrganizer = new Map<string, string[]>();
  for (const [eventId, entry] of byEvent) {
    const { count: totalTickets } = await admin
      .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId);
    const { count: checkedIn } = await admin
      .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "used");

    const rate = totalTickets && totalTickets > 0 ? ((checkedIn ?? 0) / totalTickets) * 100 : null;

    if (rate !== null && rate < minCheckinRate) {
      const reason = `Only ${rate.toFixed(0)}% checked in (${checkedIn ?? 0} of ${totalTickets})`;
      await admin.from("events").update({ payout_flagged: true, payout_flag_reason: reason }).eq("id", eventId);
      await raiseAlert(
        "payout_flagged",
        `An event's payout is on hold for review: ${reason}. Open Admin → Flagged payouts.`,
        `flagged:${eventId}`
      );
      summary.flagged.push(`${eventId}: ${reason}`);
      continue;
    }

    mainByOrganizer.set(entry.organizerId, [...(mainByOrganizer.get(entry.organizerId) ?? []), ...entry.orderIds]);
  }

  for (const [organizerId, orderIds] of mainByOrganizer) {
    tally("main", await payOrganizer({ organizerId, stage: "main", orderIds }));
  }

  // ---------- Stage 2: reserve release ----------
  const { data: reserveOrders } = await admin
    .from("orders")
    .select("id, events!inner(event_date, status, organizer_id)")
    .eq("status", "paid")
    .eq("payout_status", "main_released")
    .is("reserve_payout_id", null)
    .gt("reserve_amount", 0)
    .lte("events.event_date", reserveCutoffStr)
    .neq("events.status", "cancelled");

  const reserveByOrganizer = new Map<string, string[]>();
  for (const o of (reserveOrders ?? []) as any[]) {
    const ev = Array.isArray(o.events) ? o.events[0] : o.events;
    reserveByOrganizer.set(ev.organizer_id, [...(reserveByOrganizer.get(ev.organizer_id) ?? []), o.id]);
  }

  for (const [organizerId, orderIds] of reserveByOrganizer) {
    tally("reserve", await payOrganizer({ organizerId, stage: "reserve", orderIds }));
  }

  return NextResponse.json(summary);
}