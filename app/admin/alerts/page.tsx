import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminAlertActions from "@/components/AdminAlertActions";
import BackButton from "@/components/BackButton";

export default async function AdminAlertsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createServiceClient();

  const [{ data: alerts }, { data: stuckRefunds }, { data: problemPayouts }] = await Promise.all([
    admin
      .from("admin_alerts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    admin
      .from("checkouts")
      .select("reference, amount, status, refund_attempts, last_refund_error, events(title)")
      .in("status", ["needs_refund", "refund_failed"])
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("payouts")
      .select("reference, amount, stage, status, failure_reason, created_at, users:organizer_id(full_name)")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="py-11 pb-16">
      <BackButton href="/admin" label="Back to admin" />
      <h1 className="hero-title-sm font-display font-bold tracking-tight mb-2">Alerts</h1>
      <p className="text-paperDim text-sm mb-8">Things that need a person: failed refunds, failed payouts, held events.</p>

      <h2 className="text-lg font-bold font-display mb-3">Open alerts</h2>
      {!alerts || alerts.length === 0 ? (
        <div className="text-paperDim text-sm py-6 mb-8">Nothing open. All clear.</div>
      ) : (
        <div className="space-y-3 mb-10">
          {alerts.map((a: any) => (
            <div key={a.id} className="bg-panel border border-hairline rounded-card p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-coral/20 text-coral">{a.kind.replace(/_/g, " ")}</span>
                  <span className="text-[11.5px] text-paperDim">{fmtDate(a.created_at)}</span>
                </div>
                <p className="text-[13.5px] text-paperDim">{a.message}</p>
              </div>
              <AdminAlertActions alertId={a.id} />
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold font-display mb-3">Refunds not yet delivered</h2>
      {!stuckRefunds || stuckRefunds.length === 0 ? (
        <div className="text-paperDim text-sm py-6 mb-8">None.</div>
      ) : (
        <div className="space-y-2 mb-10">
          {stuckRefunds.map((c: any) => (
            <div key={c.reference} className="bg-panel border border-hairline rounded-lg p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">
                  {(Array.isArray(c.events) ? c.events[0]?.title : c.events?.title) ?? "Event"}
                </div>
                <span className="font-mono text-[13px] text-teal shrink-0">₦{Number(c.amount).toLocaleString()}</span>
              </div>
              <div className="text-[11.5px] text-paperDim mt-1">
                <span className={c.status === "refund_failed" ? "text-coral" : "text-amber"}>
                  {c.status === "refund_failed" ? "needs manual refund" : "retrying"}
                </span>
                {" · "}attempts: {c.refund_attempts} · ref {c.reference}
              </div>
              {c.last_refund_error && <div className="text-[11.5px] text-paperDim mt-1">{c.last_refund_error}</div>}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold font-display mb-3">Payouts pending or failed</h2>
      {!problemPayouts || problemPayouts.length === 0 ? (
        <div className="text-paperDim text-sm py-6">None.</div>
      ) : (
        <div className="space-y-2">
          {problemPayouts.map((p: any) => (
            <div key={p.reference} className="bg-panel border border-hairline rounded-lg p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">
                  {(Array.isArray(p.users) ? p.users[0]?.full_name : p.users?.full_name) ?? "Organizer"} · {p.stage}
                </div>
                <span className="font-mono text-[13px] text-teal shrink-0">₦{Number(p.amount).toLocaleString()}</span>
              </div>
              <div className="text-[11.5px] text-paperDim mt-1">
                <span className={p.status === "failed" ? "text-coral" : "text-amber"}>{p.status}</span>
                {" · "}{fmtDate(p.created_at)}
              </div>
              {p.failure_reason && <div className="text-[11.5px] text-paperDim mt-1">{p.failure_reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}