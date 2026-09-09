import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { reference, eventId, ticketTypeId, quantity, amount } = await req.json();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

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

  const feePercent = Number(process.env.PARTAEY_PLATFORM_FEE_PERCENT ?? "5");
  const reservePercent = Number(process.env.PARTAEY_RESERVE_PERCENT ?? "15");

  const platformFee = Math.round(amount * feePercent) / 100;
  const organizerAmount = Math.round((amount - platformFee) * 100) / 100;
  const reserveAmount = Math.round(organizerAmount * reservePercent) / 100;
  const releaseAmount = Math.round((organizerAmount - reserveAmount) * 100) / 100;

  const admin = createServiceClient();

  const { error: orderError } = await admin.from("orders").insert({
    user_id: user.id,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    quantity,
    amount,
    platform_fee: platformFee,
    organizer_amount: organizerAmount,
    reserve_amount: reserveAmount,
    release_amount: releaseAmount,
    payout_status: "held",
    paystack_reference: reference,
    status: "paid"
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

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