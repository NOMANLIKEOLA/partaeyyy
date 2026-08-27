import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyBox from "@/components/BuyBox";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*), users:organizer_id(full_name)")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const date = new Date(event.event_date);
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <div
        className="h-[280px] rounded-card flex items-end p-7 mt-6"
        style={{ background: "linear-gradient(160deg,#3B1250,#7A1E52)" }}
      >
        <div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-[#3B1250] text-[#E4B8FF] font-semibold inline-block mb-2.5">
            {event.category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-10 mt-8">
        <div>
          <h1 className="font-display text-[32px] font-bold mb-3.5 tracking-tight">{event.title}</h1>
          <div className="flex gap-5 text-paperDim text-sm mb-6 flex-wrap">
            <div>{dateLabel}{event.start_time ? ` · ${event.start_time}` : ""}</div>
            <div>{event.venue ? `${event.venue}, ` : ""}{event.city}</div>
          </div>
          <p className="text-[#D8D3C6] text-[14.5px] leading-[1.75] max-w-[600px] whitespace-pre-line">
            {event.description}
          </p>
          <div className="flex items-center gap-3 mt-7 pt-6 border-t border-hairline">
            <div className="w-[38px] h-[38px] rounded-full bg-coral flex items-center justify-center font-bold text-[13px] text-[#2A0C02]">
              {(event.users?.full_name ?? "PT").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium">{event.users?.full_name ?? "Partaey organizer"}</div>
              <div className="text-[12.5px] text-paperDim">Organizer</div>
            </div>
          </div>
        </div>

        <BuyBox
          eventId={event.id}
          eventTitle={event.title}
          ticketTypes={event.ticket_types}
          userId={user?.id ?? null}
          userEmail={user?.email ?? null}
        />
      </div>
    </>
  );
}