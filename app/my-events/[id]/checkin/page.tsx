import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TicketScanner from "@/components/TicketScanner";

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase.from("events").select("id, title, organizer_id").eq("id", params.id).single();
  if (!event || event.organizer_id !== user.id) notFound();

  const { count: totalTickets } = await supabase
    .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  const { count: checkedIn } = await supabase
    .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("status", "used");

  return (
    <div className="max-w-[420px] mx-auto py-10 pb-16">
      <h1 className="font-display text-2xl font-bold mb-1.5">Check-in — {event.title}</h1>
      <p className="text-paperDim text-sm mb-6">{checkedIn ?? 0} of {totalTickets ?? 0} checked in</p>
      <TicketScanner eventId={event.id} />
    </div>
  );
}