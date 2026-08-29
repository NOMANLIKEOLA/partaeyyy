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
    .select("paystack_subaccount_code")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-[640px] mx-auto py-8 pb-16">
      <h1 className="font-display text-[28px] font-bold mb-1.5">List your event</h1>
      <p className="text-paperDim text-sm mb-6">
        Fill in the details below. It goes live on Partaey as soon as you publish.
      </p>

      {!profile?.paystack_subaccount_code && (
        <div className="bg-panel2 border border-dashed border-hairline rounded-card p-4 mb-8 text-[13px]">
          <span className="text-amber font-medium">Heads up:</span> you haven't connected a payout account yet.
          If you're charging for tickets, ticket money won't reach your bank until you{" "}
          <Link href="/payouts" className="text-amber underline">set that up</Link>. Free events don't need this.
        </div>
      )}

      <CreateEventForm userId={user.id} />
    </div>
  );
}