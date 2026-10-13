import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TicketQR from "@/components/TicketQR";
import BackButton from "@/components/BackButton";
import ScrollReveal from "@/components/ScrollReveal";

export default async function MyTicketsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, events(title, event_date, venue, city), ticket_types(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="py-11 pb-16">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <h1 className="hero-title-sm font-display font-bold tracking-tight mb-2">My tickets</h1>
      <p className="text-paperDim text-sm mb-8">Show the QR code at the door.</p>

      {!tickets || tickets.length === 0 ? (
        <div className="text-paperDim text-sm py-16 text-center">No tickets yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {tickets.map((t: any, i: number) => (
            <ScrollReveal key={t.id} index={i % 6}>
              <div className="bg-panel border border-hairline rounded-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{t.events?.title}</div>
                    <div className="text-[12.5px] text-paperDim">
                      {t.ticket_types?.name ?? "General"} ·{" "}
                      {new Date(t.events?.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${t.status === "used" ? "bg-panel2 text-paperDim" : "bg-teal/20 text-teal"}`}>
                    {t.status === "used" ? "Used" : "Valid"}
                  </span>
                </div>
                <TicketQR code={t.code} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}