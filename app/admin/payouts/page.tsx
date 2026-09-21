import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminPayoutOverride from "@/components/AdminPayoutOverride";

export default async function AdminPayoutsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createServiceClient();
  const { data: events } = await admin
    .from("events")
    .select("id, title, event_date, users:organizer_id(full_name)")
    .eq("payout_flagged", true)
    .order("event_date", { ascending: false });

  const eventsWithStats = await Promise.all(
    (events ?? []).map(async (e: any) => {
      const { count: total } = await admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id);
      const { count: used } = await admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("status", "used");
      const { data: held } = await admin.from("orders").select("release_amount").eq("event_id", e.id).eq("payout_status", "held");
      const heldAmount = (held ?? []).reduce((s: number, o: any) => s + Number(o.release_amount ?? 0), 0);
      return { ...e, total: total ?? 0, used: used ?? 0, heldAmount };
    })
  );

  return (
    <div className="py-11 pb-16">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Flagged payouts</h1>
      <p className="text-paperDim text-sm mb-8">Events with suspiciously low check-in rates, held from automatic release.</p>

      {eventsWithStats.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">Nothing flagged.</div>
      ) : (
        <div className="space-y-4">
          {eventsWithStats.map((e: any) => (
            <div key={e.id} className="bg-panel border border-hairline rounded-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Link href={`/event/${e.id}`} className="font-medium hover:text-amber transition">{e.title}</Link>
                <div className="text-[12.5px] text-paperDim mt-1">
                  {e.users?.full_name ?? "—"} · {new Date(e.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="text-[12.5px] text-coral mt-1">
                  {e.used} of {e.total} checked in · ₦{e.heldAmount.toLocaleString()} held
                </div>
              </div>
              <AdminPayoutOverride eventId={e.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}