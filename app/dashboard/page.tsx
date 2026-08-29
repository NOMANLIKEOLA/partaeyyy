import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventCard from "@/components/EventCard";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: savedUpcoming }, { data: orderedUpcoming }, { data: orderedPast }] = await Promise.all([
    supabase
      .from("saved_events")
      .select("events!inner(*, ticket_types(price))")
      .eq("user_id", user.id)
      .gte("events.event_date", today),
    supabase
      .from("orders")
      .select("events!inner(*, ticket_types(price))")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .gte("events.event_date", today),
    supabase
      .from("orders")
      .select("events!inner(*, ticket_types(price))")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .lt("events.event_date", today)
  ]);

  const bucketMap = new Map<string, any>();
  for (const row of [...(savedUpcoming ?? []), ...(orderedUpcoming ?? [])]) {
    bucketMap.set(row.events.id, row.events);
  }
  const bucketEvents = Array.from(bucketMap.values());

  const attendedMap = new Map<string, any>();
  for (const row of orderedPast ?? []) {
    attendedMap.set(row.events.id, row.events);
  }
  const attendedCount = attendedMap.size;

  return (
    <>
      <div className="pt-11 pb-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-paperDim text-sm mt-2">Here's what's happening with your account.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 my-8">
        <div className="card-float p-6.5">
          <div className="text-[13px] text-paperDim mb-4">Event bucket list</div>
          <div className="font-display text-[36px] font-bold">{bucketEvents.length}</div>
          <div className="text-[12.5px] text-paperDim mt-2">events saved to go to</div>
        </div>
        <div className="card-float p-6.5">
          <div className="text-[13px] text-paperDim mb-4">Events attended</div>
          <div className="font-display text-[36px] font-bold">{attendedCount}</div>
          <div className="text-[12.5px] text-paperDim mt-2">since you joined Partaey</div>
        </div>
        <Link href="/create" className="card-float p-6.5 bg-panel2 border-dashed block">
          <div className="text-[13px] text-paperDim mb-4">Input new event</div>
          <div className="font-display text-[36px] font-bold text-amber">+</div>
          <div className="text-[12.5px] text-paperDim mt-2">create and list an event</div>
        </Link>
      </div>

      <div className="flex items-baseline justify-between my-9">
        <h2 className="text-xl font-bold font-display">Your bucket list</h2>
      </div>

      {bucketEvents.length === 0 ? (
        <div className="text-paperDim text-sm py-10 text-center">
          Nothing saved yet — browse{" "}
          <Link href="/" className="text-amber underline">discover</Link> and save an event, or buy a ticket.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 mb-14">
          {bucketEvents.map((event: any) => {
            const prices = event.ticket_types?.map((t: any) => t.price) ?? [];
            const lowest = prices.length ? Math.min(...prices) : null;
            return <EventCard key={event.id} event={event} lowestPrice={lowest} />;
          })}
        </div>
      )}
    </>
  );
}