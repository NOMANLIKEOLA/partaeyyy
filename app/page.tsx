import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EventCard from "@/components/EventCard";
import type { PartaeyEvent } from "@/lib/types";

const CATEGORIES = [
  "All",
  "Raves & nightlife",
  "Concerts",
  "Comedy",
  "Conferences",
  "Festivals",
  "Sports",
  "Meetups"
];

export default async function HomePage({
  searchParams
}: {
  searchParams: { category?: string; q?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("*, ticket_types(price)")
    .eq("status", "published")
    .order("event_date", { ascending: true });

  if (searchParams.category && searchParams.category !== "All") {
    query = query.eq("category", searchParams.category);
  }
  if (searchParams.q) {
    query = query.ilike("title", `%${searchParams.q}%`);
  }

  const { data: events } = await query;

  return (
    <>
      <section className="py-14 border-b border-hairline">
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight max-w-[680px]">
          Every event, <span className="text-amber">everywhere</span> in Nigeria.
        </h1>
        <p className="text-paperDim mt-3.5 max-w-[480px]">
          Raves, concerts, comedy, conferences, festivals. Find what's happening near you, or list your own event in minutes.
        </p>

        <form action="/" className="mt-7 flex bg-panel border border-hairline rounded-full p-1.5 max-w-[640px]">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            type="text"
            placeholder="Search events, artists, venues..."
            className="flex-1 bg-transparent border-none outline-none px-4.5 py-3 text-sm"
          />
          <button className="bg-coral text-[#2A0C02] px-5.5 rounded-full font-semibold text-sm">
            Search
          </button>
        </form>

        <div className="flex gap-2.5 flex-wrap mt-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={c === "All" ? "/" : `/?category=${encodeURIComponent(c)}`}
              className={`chip ${(!searchParams.category && c === "All") || searchParams.category === c ? "on" : ""}`}
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <div className="flex items-baseline justify-between my-9">
        <h2 className="text-xl font-bold font-display">
          {searchParams.category && searchParams.category !== "All" ? searchParams.category : "Trending this week"}
        </h2>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">
          No events yet — be the first to{" "}
          <Link href="/create" className="text-amber underline">list one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {events.map((event: PartaeyEvent & { ticket_types: { price: number }[] }) => {
            const prices = event.ticket_types?.map((t) => t.price) ?? [];
            const lowest = prices.length ? Math.min(...prices) : null;
            return <EventCard key={event.id} event={event} lowestPrice={lowest} />;
          })}
        </div>
      )}

      <div className="my-14 bg-panel2 border border-dashed border-hairline rounded-card p-7 flex items-center justify-between gap-5">
        <div>
          <h3 className="text-lg font-semibold mb-1.5">Running an event? List it on Partaey.</h3>
          <p className="text-paperDim text-[13.5px]">
            Set up ticket tiers, sell with Paystack, and track sales from one dashboard — free to list.
          </p>
        </div>
        <Link href="/create" className="btn-primary whitespace-nowrap">Create an event</Link>
      </div>
    </>
  );
}