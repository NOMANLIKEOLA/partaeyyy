import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateEventForm from "@/components/CreateEventForm";

export default async function CreateEventPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-[640px] mx-auto py-8 pb-16">
      <h1 className="font-display text-[28px] font-bold mb-1.5">List your event</h1>
      <p className="text-paperDim text-sm mb-8">
        Fill in the details below. It goes live on Partaey as soon as you publish.
      </p>
      <CreateEventForm userId={user.id} />
    </div>
  );
}