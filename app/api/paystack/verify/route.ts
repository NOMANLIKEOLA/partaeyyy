import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { finalizeCheckout } from "@/lib/checkout";

export async function POST(req: NextRequest) {
  const { reference } = await req.json();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createServiceClient();
  const { data: checkout } = await admin
    .from("checkouts")
    .select("user_id, amount, status")
    .eq("reference", reference)
    .maybeSingle();

  if (!checkout || checkout.user_id !== user.id) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }

  // The webhook may have finished this already. That's success, not an error.
  if (checkout.status === "completed") {
    return NextResponse.json({ ok: true });
  }

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const verifyJson = await verifyRes.json();

  if (!verifyJson.status || verifyJson.data?.status !== "success") {
    return NextResponse.json({ error: "Payment not verified." }, { status: 400 });
  }

  // Compare against what the SERVER priced, not anything the browser sent.
  if (verifyJson.data.amount !== Math.round(Number(checkout.amount) * 100)) {
    return NextResponse.json({ error: "Amount mismatch." }, { status: 400 });
  }

  const result = await finalizeCheckout(reference);

  if (result === "completed" || result === "already_done") {
    return NextResponse.json({ ok: true });
  }
  if (result === "refunded") {
    return NextResponse.json(
      { error: "Those tickets are no longer available, so your payment has been refunded. It can take a few business days to reach your bank." },
      { status: 409 }
    );
  }
  if (result === "needs_refund" || result === "refund_failed") {
    return NextResponse.json(
      { error: `Those tickets are no longer available. Your refund is being processed. If you don't see it within a few days, contact support with reference ${reference}.` },
      { status: 409 }
    );
  }
  return NextResponse.json({ error: "Couldn't confirm your tickets." }, { status: 500 });
}