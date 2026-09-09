import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyBox from "@/components/BuyBox";
import SaveButton from "@/components/SaveButton";
import ReportEventButton from "@/components/ReportEventButton";
import EventPhotoGallery from "@/components/EventPhotoGallery"; 
import { calculateAge } from "@/lib/age";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*), users:organizer_id(full_name)")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let alreadySaved = false;
  let viewerAge: number | null = null;
  let canUploadPhotos = false;

  if (user) {
    const [{ data: savedRow }, { data: viewerProfile }] = await Promise.all([
      supabase.from("saved_events").select("event_id").eq("user_id", user.id).eq("event_id", event.id).maybeSingle(),
      supabase.from("users").select("date_of_birth").eq("id", user.id).single()
    ]);
    alreadySaved = !!savedRow;
    viewerAge = calculateAge(viewerProfile?.date_of_birth ?? null);

    canUploadPhotos = event.organizer_id === user.id;
    if (!canUploadPhotos) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", event.id)
        .eq("status", "paid")
        .maybeSingle();
      canUploadPhotos = !!orderRow;
    }
  }

  const { data: photos } = await supabase
    .from("event_photos")
    .select("id, photo_url")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  const date = new Date(event.event_date);
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <div
        className={`h-[180px] sm:h-[220px] md:h-[280px] rounded-card flex items-end p-4 sm:p-7 mt-4 sm:mt-6 relative ${event.cover_image_url ? "bg-cover bg-center" : ""}`}
        style={
          event.cover_image_url
            ? { backgroundImage: `url(${event.cover_image_url})` }
            : { background: "linear-gradient(160deg,#3B1250,#7A1E52)" }
        }
      >
        {event.cover_image_url && <div className="absolute inset-0 bg-black/40 rounded-card" />}
        <div className="relative flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-[#3B1250] text-[#E4B8FF] font-semibold inline-block">
            {event.category}
          </span>
          {event.is_18_plus && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-coral text-[#2A0C02] font-semibold inline-block">
              18+
            </span>
          )}
          {event.status === "cancelled" && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-panel border border-hairline text-paperDim font-semibold inline-block">
              Cancelled
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10 mt-8">
        <div>
          <h1 className="font-display text-2xl sm:text-[28px] md:text-[32px] font-bold mb-3.5 tracking-tight">
            {event.title}
          </h1>
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

        <div>
          <BuyBox
            eventId={event.id}
            eventTitle={event.title}
            ticketTypes={event.ticket_types}
            userId={user?.id ?? null}
            userEmail={user?.email ?? null}
            is18Plus={event.is_18_plus}
            viewerAge={viewerAge}
            eventCancelled={event.status === "cancelled"}
          />
          <SaveButton eventId={event.id} userId={user?.id ?? null} initiallySaved={alreadySaved} />
          <ReportEventButton eventId={event.id} userId={user?.id ?? null} />
        </div>
      </div>


      <EventPhotoGallery
        eventId={event.id}
        photos={photos ?? []}
        canUpload={canUploadPhotos}
        userId={user?.id ?? null}
        
      />
    </>
  );
}