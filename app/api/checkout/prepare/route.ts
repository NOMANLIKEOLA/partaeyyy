import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/age";
import { finalizeCheckout } from "@/lib/checkout";

const MAX_PER_TIER = 10;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Log in to buy tickets." }, { status: 401 });
  }

  const body = await req.json();
  const eventId: string | undefined = body.eventId;

  // Merge duplicate lines and drop anything malformed.
  const wanted = new Map<string, number>();
  for (const item of Array.isArray(body.items) ? body.items : []) {
    const qty = Number(item?.quantity);
    if (!item?.ticketTypeId || !Number.isInteger(qty) || qty < 1) continue;
    wanted.set(item.ticketTypeId, (wanted.get(item.ticketTypeId) ?? 0) + qty);
  }

  if (!eventId || wanted.size === 0) {
    return NextResponse.json({ error: "Select at least one ticket." }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: event } = await admin
    .from("events")
    .select("id, status, event_date, is_18_plus, ticket_types(id, name, price, quantity, quantity_sold)")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status !== "published") {
    return NextResponse.json({ error: "This event isn't on sale." }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (event.event_date < today) {
    return NextResponse.json({ error: "This event has already happened." }, { status: 400 });
  }

  // Age gating enforced here, not just in the browser.
  if (event.is_18_plus) {
    const { data: profile } = await admin
      .from("users")
      .select("date_of_birth")
      .eq("id", user.id)
      .single();
    const age = calculateAge(profile?.date_of_birth ?? null);
    if (age === null) {
      return NextResponse.json({ error: "Add your date of birth in your profile to buy tickets to this 18+ event." }, { status: 403 });
    }
    if (age < 18) {
      return NextResponse.json({ error: "You must be 18 or older to attend this event." }, { status: 403 });
    }
  }

  // Price everything from the database, never from the request.
  const lines: { ticket_type_id: string; quantity: number; unit_price: number }[] = [];
  let total = 0;

  for (const [ticketTypeId, quantity] of wanted) {
    const tier = event.ticket_types.find((t: any) => t.id === ticketTypeId);
    if (!tier) {
      return NextResponse.json({ error: "That ticket type isn't part of this event." }, { status: 400 });
    }
    if (quantity > MAX_PER_TIER) {
      return NextResponse.json({ error: `You can buy up to ${MAX_PER_TIER} tickets per type.` }, { status: 400 });
    }
    const left = tier.quantity - tier.quantity_sold;
    if (quantity > left) {
      return NextResponse.json(
        { error: left > 0 ? `Only ${left} ${tier.name} ticket${left === 1 ? "" : "s"} left.` : `${tier.name} is sold out.` },
        { status: 409 }
      );
    }
    lines.push({ ticket_type_id: ticketTypeId, quantity, unit_price: Number(tier.price) });
    total += Number(tier.price) * quantity;
  }

  // Consistent lock order inside finalize_checkout avoids deadlocks
  // when two buyers hit overlapping tiers at once.
  lines.sort((a, b) => a.ticket_type_id.localeCompare(b.ticket_type_id));

  const isFree = total === 0;
  const reference = `${isFree ? "free" : "ptx"}-${crypto.randomUUID()}`;

  const { error: insertError } = await admin.from("checkouts").insert({
    reference,
    user_id: user.id,
    event_id: eventId,
    items: lines,
    amount: total
  });
  if (insertError) {
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  }

  // Nothing to pay: issue the tickets straight away.
  if (isFree) {
    const result = await finalizeCheckout(reference);
    if (result === "completed" || result === "already_done") {
      return NextResponse.json({ free: true });
    }
    return NextResponse.json({ error: "Those tickets just ran out." }, { status: 409 });
  }

  return NextResponse.json({ reference, amount: total, email: user.email });
}