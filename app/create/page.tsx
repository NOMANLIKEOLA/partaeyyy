import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateEventForm from "@/components/CreateEventForm";

export default async function CreateEventPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, phone, paystack_recipient_code")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-[640px] mx-auto py-8 pb-16">
      <h1 className="font-display text-[28px] font-bold mb-1.5">List your event</h1>
      <p className="text-paperDim text-sm mb-6">
        Fill in the details below. It goes live on Partaey as soon as you publish.
      </p>

      {!profile?.full_name && (
        <div className="bg-panel2 border border-dashed border-hairline rounded-card p-4 mb-4 text-[13px]">
          <span className="text-amber font-medium">Add your name</span> to your{" "}
          <Link href="/profile" className="text-amber underline">profile</Link> — it's shown as the organizer on
          every event you list.
        </div>
      )}

      {!profile?.phone && (
        <div className="bg-panel2 border border-dashed border-hairline rounded-card p-4 mb-4 text-[13px]">
          <span className="text-amber font-medium">Add a phone number</span> to your{" "}
          <Link href="/profile" className="text-amber underline">profile</Link> before listing paid events — it's
          how we reach you if there's ever a dispute.
        </div>
      )}

      {!profile?.paystack_recipient_code && (
        <div className="bg-panel2 border border-dashed border-hairline rounded-card p-4 mb-8 text-[13px]">
          <span className="text-amber font-medium">Heads up:</span> you haven't connected a payout account yet.
          Ticket money for paid events won't reach you until you{" "}
          <Link href="/payouts" className="text-amber underline">set that up</Link>. Free events don't need this.
        </div>
      )}

      <CreateEventForm userId={user.id} hasPhone={!!profile?.phone} hasName={!!profile?.full_name} />
    </div>
  );
}