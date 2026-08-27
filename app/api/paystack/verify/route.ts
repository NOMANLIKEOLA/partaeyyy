import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { reference, eventId, ticketTypeId, quantity, amount } = await req.json();

  // 1. Confirm who's asking (uses the signed-in user's session/cookies)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // 2. Verify the payment actually happened, server-side, against Paystack —
  // never trust the amount/status the browser reports.
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const verifyJson = await verifyRes.json();

  if (!verifyJson.status || verifyJson.data?.status !== "success") {
    return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
  }

  const paidKobo = verifyJson.data.amount;
  if (paidKobo !== Math.round(amount * 100)) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // 3. Write the order using the service-role client, which bypasses RLS —
  // this is the one place orders get inserted, and only after verification.
  const admin = createServiceClient();

  const { error: orderError } = await admin.from("orders").insert({
    user_id: user.id,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    quantity,
    amount,
    paystack_reference: reference,
    status: "paid"
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // 4. Bump quantity_sold on the ticket tier
  const { data: tier } = await admin
    .from("ticket_types")
    .select("quantity_sold")
    .eq("id", ticketTypeId)
    .single();

  await admin
    .from("ticket_types")
    .update({ quantity_sold: (tier?.quantity_sold ?? 0) + quantity })
    .eq("id", ticketTypeId);

  return NextResponse.json({ ok: true });
}