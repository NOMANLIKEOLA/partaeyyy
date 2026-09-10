import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminReportActions from "@/components/AdminReportActions";

export default async function AdminReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createServiceClient();
  const { data: reports } = await admin
    .from("event_reports")
    .select("*, events(id, title), users:reporter_id(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="py-11 pb-16">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Reports</h1>
      <p className="text-paperDim text-sm mb-8">Events flagged by users.</p>

      {!reports || reports.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">No reports.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((r: any) => (
            <div key={r.id} className="bg-panel border border-hairline rounded-card p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Link href={`/event/${r.events?.id}`} className="font-medium hover:text-amber transition">
                    {r.events?.title ?? "Deleted event"}
                  </Link>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-coral/20 text-coral" : "bg-panel2 text-paperDim"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="text-[12.5px] text-paperDim mb-1.5">
                  {r.reason} · reported by {r.users?.full_name ?? "unknown"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                {r.details && <p className="text-[13px] text-[#D8D3C6]">{r.details}</p>}
              </div>
              {r.status === "open" && <AdminReportActions reportId={r.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}