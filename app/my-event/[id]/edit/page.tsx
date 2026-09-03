import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditEventForm from "@/components/EditEventForm";

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", params.id)
    .single();

  if (!event || event.organizer_id !== user.id) notFound();

  return (
    <div className="max-w-[640px] mx-auto py-8 pb-16">
      <h1 className="font-display text-[28px] font-bold mb-1.5">Edit event</h1>
      <p className="text-paperDim text-sm mb-8">Update your event's details.</p>
      <EditEventForm event={event} />
    </div>
  );
}