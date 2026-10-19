import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { code, eventId } = await req.json();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createServiceClient();

  const { data: event } = await admin
    .from("events")
    .select("organizer_id, status")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Not authorized to scan for this event" }, { status: 403 });
  }
  if (event.status === "cancelled") {
    return NextResponse.json({ result: "invalid", message: "This event was cancelled." });
  }

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, status, event_id, checked_in_at")
    .eq("code", code)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ result: "invalid", message: "Ticket not found." });
  }
  if (ticket.event_id !== eventId) {
    return NextResponse.json({ result: "invalid", message: "This ticket is for a different event." });
  }
  if (ticket.status === "void") {
    return NextResponse.json({ result: "invalid", message: "This ticket was cancelled and refunded." });
  }
  if (ticket.status === "used") {
    return NextResponse.json({
      result: "already_used",
      message: `Already checked in${ticket.checked_in_at ? " at " + new Date(ticket.checked_in_at).toLocaleTimeString() : ""}.`
    });
  }

  // Atomic: this UPDATE only touches a row that is still 'valid' at the
  // moment it runs, so two simultaneous scans can't both succeed.
  const { data: updated } = await admin
    .from("tickets")
    .update({ status: "used", checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status", "valid")
    .select()
    .maybeSingle();

  if (!updated) {
    return NextResponse.json({ result: "already_used", message: "Already checked in, just now, by someone else." });
  }

  return NextResponse.json({ result: "valid", message: "Checked in ✓" });
}