import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminReviewActions from "@/components/AdminReviewActions";

export default async function AdminReviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  const admin = createServiceClient();
  const { data: events } = await admin
    .from("events")
    .select("*, ticket_types(name, price, quantity), users:organizer_id(full_name, phone)")
    .eq("pending_review", true)
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  return (
    <div className="py-11 pb-16">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Events pending review</h1>
      <p className="text-paperDim text-sm mb-8">First paid events from new organizers, awaiting approval.</p>

      {!events || events.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">Nothing waiting for review.</div>
      ) : (
        <div className="space-y-4">
          {events.map((event: any) => (
            <div key={event.id} className="bg-panel border border-hairline rounded-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium mb-1">{event.title}</div>
                  <div className="text-[12.5px] text-paperDim mb-2">
                    {event.category} · {event.city} · {new Date(event.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-[12.5px] text-paperDim mb-2">
                    Organizer: {event.users?.full_name ?? "—"} · {event.users?.phone ?? "no phone on file"}
                  </div>
                  <div className="text-[12.5px] text-paperDim mb-3">
                    {event.ticket_types.map((t: any) => `${t.name}: ₦${t.price.toLocaleString()} × ${t.quantity}`).join(" · ")}
                  </div>
                  <p className="text-[13px] text-[#D8D3C6] max-w-[600px]">{event.description}</p>
                </div>
                <AdminReviewActions eventId={event.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}