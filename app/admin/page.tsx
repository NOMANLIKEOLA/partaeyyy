import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createServiceClient();

  const [
    { count: totalUsers },
    { count: publishedEvents },
    { count: pendingReview },
    { count: cancelledEvents },
    { count: totalOrders },
    { data: paidOrders },
    { count: openReports },
    { data: recentEvents },
    { data: recentOrders }
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("events").select("id", { count: "exact", head: true }).eq("pending_review", true),
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    admin.from("orders").select("amount, platform_fee, organizer_amount, payout_status").eq("status", "paid"),
    admin.from("event_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin
      .from("events")
      .select("id, title, city, category, status, pending_review, created_at, users:organizer_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("orders")
      .select("id, amount, payout_status, created_at, events(title), users:user_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  const totalGMV = (paidOrders ?? []).reduce((s: number, r: { amount: any; }) => s + Number(r.amount), 0);
  const totalPlatformFees = (paidOrders ?? []).reduce((s: number, r: { platform_fee: any; }) => s + Number(r.platform_fee ?? 0), 0);
  const heldFunds = (paidOrders ?? [])
    .filter((r: { payout_status: string; }) => r.payout_status === "held" || r.payout_status === "main_released")
    .reduce((s: number, r: { organizer_amount: any; }) => s + Number(r.organizer_amount ?? 0), 0);

  return (
    <div className="py-11 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="text-paperDim text-sm mt-2">Day-to-day overview of Partaey.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/review" className="btn-ghost relative">
            Review queue
            {(pendingReview ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber text-[#241B00] text-[11px] font-semibold">
                {pendingReview}
              </span>
            )}
          </Link>
          <Link href="/admin/reports" className="btn-ghost relative">
            Reports
            {(openReports ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral text-[#2A0C02] text-[11px] font-semibold">
                {openReports}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Total users</div>
          <div className="font-display text-2xl font-bold">{totalUsers ?? 0}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Live events</div>
          <div className="font-display text-2xl font-bold">{publishedEvents ?? 0}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Pending review</div>
          <div className="font-display text-2xl font-bold text-amber">{pendingReview ?? 0}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Cancelled events</div>
          <div className="font-display text-2xl font-bold">{cancelledEvents ?? 0}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Paid orders</div>
          <div className="font-display text-2xl font-bold">{totalOrders ?? 0}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Total sales (GMV)</div>
          <div className="font-display text-2xl font-bold text-teal">₦{totalGMV.toLocaleString()}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Platform fees earned</div>
          <div className="font-display text-2xl font-bold text-teal">₦{totalPlatformFees.toLocaleString()}</div>
        </div>
        <div className="card-float p-5">
          <div className="text-[12px] text-paperDim mb-2">Currently held</div>
          <div className="font-display text-2xl font-bold text-amber">₦{heldFunds.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div>
          <h2 className="text-lg font-bold font-display mb-4">Recent events</h2>
          <div className="space-y-2">
            {(recentEvents ?? []).length === 0 && <div className="text-paperDim text-sm">No events yet.</div>}
            {(recentEvents ?? []).map((e: any) => (
              <Link
                key={e.id}
                href={`/event/${e.id}`}
                className="block bg-panel border border-hairline rounded-lg p-3.5 hover:border-amber transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <span className={`text-[10.5px] px-2 py-0.5 rounded-full shrink-0 ${
                    e.status === "cancelled" ? "bg-coral/20 text-coral" :
                    e.pending_review ? "bg-amber/20 text-amber" :
                    "bg-teal/20 text-teal"
                  }`}>
                    {e.status === "cancelled" ? "Cancelled" : e.pending_review ? "Pending" : "Live"}
                  </span>
                </div>
                <div className="text-[11.5px] text-paperDim mt-1">
                  {e.users?.full_name ?? "—"} · {e.city} · {new Date(e.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold font-display mb-4">Recent payments</h2>
          <div className="space-y-2">
            {(recentOrders ?? []).length === 0 && <div className="text-paperDim text-sm">No payments yet.</div>}
            {(recentOrders ?? []).map((o: any) => (
              <div key={o.id} className="bg-panel border border-hairline rounded-lg p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{o.events?.title ?? "Deleted event"}</div>
                  <span className="font-mono text-[13px] text-teal shrink-0">₦{Number(o.amount).toLocaleString()}</span>
                </div>
                <div className="text-[11.5px] text-paperDim mt-1 flex items-center gap-2">
                  <span>{o.users?.full_name ?? "—"}</span>
                  <span>·</span>
                  <span className="capitalize">{o.payout_status.replace("_", " ")}</span>
                  <span>·</span>
                  <span>{new Date(o.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}