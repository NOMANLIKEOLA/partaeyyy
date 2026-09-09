import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CancelEventButton from "@/components/CancelEventButton";

export default async function MyEventsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("events")
    .select("*, ticket_types(price, quantity, quantity_sold)")
    .eq("organizer_id", user.id)
    .order("event_date", { ascending: false });

  return (
    <div className="py-11 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">My events</h1>
          <p className="text-paperDim text-sm mt-2">Everything you've listed on Partaey.</p>
        </div>
        <Link href="/create" className="btn-primary">Create event</Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">
          You haven't listed anything yet — <Link href="/create" className="text-amber underline">create your first event</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event: any) => {
            const ticketsSold = event.ticket_types.reduce((sum: number, t: any) => sum + t.quantity_sold, 0);
            const revenue = event.ticket_types.reduce((sum: number, t: any) => sum + t.quantity_sold * t.price, 0);

            return (
              <div key={event.id} className="bg-panel border border-hairline rounded-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Link href={`/event/${event.id}`} className="font-medium hover:text-amber transition">
                      {event.title}
                    </Link>
                    {event.status === "cancelled" && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-coral/20 text-coral">Cancelled</span>
                    )}
                    {event.pending_review && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber/20 text-amber">Pending review</span>
                    )}
                    {event.is_18_plus && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-panel2 text-paperDim">18+</span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-paperDim">
                    {new Date(event.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{event.city}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm">{ticketsSold} sold</div>
                  <div className="text-[12px] text-teal">₦{revenue.toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/my-events/${event.id}/edit`} className="btn-ghost">Edit</Link>
                  {event.status !== "cancelled" && (
                    <CancelEventButton eventId={event.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}