import Link from "next/link";
import type { PartaeyEvent } from "@/lib/types";

const CATEGORY_STYLES: Record<string, { bg: string; tag: string }> = {
  "Raves & nightlife": { bg: "from-[#3B1250] to-[#7A1E52]", tag: "bg-[#3B1250] text-[#E4B8FF]" },
  "Concerts": { bg: "from-[#1B2A4A] to-[#3C5C8A]", tag: "bg-[#1B2A4A] text-[#AFCBFF]" },
  "Conferences": { bg: "from-[#1C2E28] to-[#2E5A48]", tag: "bg-[#1C2E28] text-[#9FE3C8]" },
  "Comedy": { bg: "from-[#4A2A0F] to-[#8A5A1E]", tag: "bg-[#4A2A0F] text-[#FFD199]" },
  "Festivals": { bg: "from-[#4A0F1E] to-[#8A2338]", tag: "bg-[#4A0F1E] text-[#FF9FB3]" }
};

function fmtPrice(price: number | null) {
  if (price === null || price === 0) return "Free";
  return `₦${price.toLocaleString()}`;
}

export default function EventCard({
  event,
  lowestPrice
}: {
  event: PartaeyEvent;
  lowestPrice: number | null;
}) {
  const style = CATEGORY_STYLES[event.category] ?? CATEGORY_STYLES["Concerts"];
  const date = new Date(event.event_date);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });

  return (
    <Link href={`/event/${event.id}`} className="card-float overflow-hidden block">
      <div
        className={`h-[150px] p-3 flex items-end relative ${event.cover_image_url ? "bg-cover bg-center" : `bg-gradient-to-br ${style.bg}`}`}
        style={event.cover_image_url ? { backgroundImage: `url(${event.cover_image_url})` } : undefined}
      >
        {event.cover_image_url && <div className="absolute inset-0 bg-black/35" />}
        <span className={`relative text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.tag}`}>
          {event.category}
        </span>
        {event.is_18_plus && (
          <span className="relative ml-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-coral text-[#2A0C02]">
            18+
          </span>
        )}
        <div className="absolute top-3 right-3 bg-ink border border-white/15 rounded-lg px-2.5 py-1.5 text-center leading-tight">
          <div className="font-display text-base font-bold">{day}</div>
          <div className="text-[10px] text-paperDim uppercase">{month}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[15px] font-medium mb-1.5 leading-snug">{event.title}</h3>
        <div className="text-[12.5px] text-paperDim mb-2.5">{event.venue ?? event.city}</div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[13px] text-teal">{fmtPrice(lowestPrice)}</span>
        </div>
      </div>
    </Link>
  );
}