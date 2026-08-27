import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventCard from "@/components/EventCard";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ count: savedCount }, { count: attendedCount }, { data: savedEvents }] = await Promise.all([
    supabase.from("saved_events").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "paid"),
    supabase
      .from("saved_events")
      .select("events(*, ticket_types(price))")
      .eq("user_id", user.id)
      .limit(6)
  ]);

  return (
    <>
      <div className="pt-11 pb-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-paperDim text-sm mt-2">Here's what's happening with your account.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 my-8">
        <div className="card-float p-6.5">
          <div className="text-[13px] text-paperDim mb-4">Event bucket list</div>
          <div className="font-display text-[36px] font-bold">{savedCount ?? 0}</div>
          <div className="text-[12.5px] text-paperDim mt-2">events saved to go to</div>
        </div>
        <div className="card-float p-6.5">
          <div className="text-[13px] text-paperDim mb-4">Events attended</div>
          <div className="font-display text-[36px] font-bold">{attendedCount ?? 0}</div>
          <div className="text-[12.5px] text-paperDim mt-2">since you joined Partaey</div>
        </div>
        <Link href="/create" className="card-float p-6.5 bg-panel2 border-dashed block">
          <div className="text-[13px] text-paperDim mb-4">Input new event</div>
          <div className="font-display text-[36px] font-bold text-amber">+</div>
          <div className="text-[12.5px] text-paperDim mt-2">create and list an event</div>
        </Link>
      </div>

      <div className="flex items-baseline justify-between my-9">
        <h2 className="text-xl font-bold font-display">Your saved events</h2>
      </div>

      {!savedEvents || savedEvents.length === 0 ? (
        <div className="text-paperDim text-sm py-10 text-center">
          Nothing saved yet — browse{" "}
          <Link href="/" className="text-amber underline">discover</Link> and tap save on an event.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 mb-14">
          {savedEvents.map((row: any) => {
            const event = row.events;
            const prices = event.ticket_types?.map((t: any) => t.price) ?? [];
            const lowest = prices.length ? Math.min(...prices) : null;
            return <EventCard key={event.id} event={event} lowestPrice={lowest} />;
          })}
        </div>
      )}
    </>
  );
}