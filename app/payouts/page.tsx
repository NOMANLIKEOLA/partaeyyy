import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayoutSetupForm from "@/components/PayoutSetupForm";

export default async function PayoutsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("paystack_recipient_code, account_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-[480px] mx-auto py-12 pb-20">
      <h1 className="font-display text-[26px] font-bold mb-1.5">Payout account</h1>
      <p className="text-paperDim text-sm mb-8">
        Connect a bank account so ticket sales on your events pay out to you after each event happens.
      </p>
      <PayoutSetupForm
        alreadyConnected={!!profile?.paystack_recipient_code}
        accountName={profile?.account_name}
      />
    </div>
  );
}