import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId } = await req.json();
  if (!alertId) return NextResponse.json({ error: "Missing alert" }, { status: 400 });

  const admin = createServiceClient();
  const { error } = await admin
    .from("admin_alerts")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}