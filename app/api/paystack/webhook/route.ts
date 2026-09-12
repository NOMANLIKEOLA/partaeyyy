import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const data = event.data;
    const reference = data.reference;
    const metadata = data.metadata ?? {};
    const { event_id, ticket_type_id, quantity } = metadata;

    if (!event_id || !ticket_type_id) {
      return NextResponse.json({ received: true });
    }

    const admin = createServiceClient();

    // Idempotency: skip if we've already recorded this reference
    // (the browser-side verify call may have already done it).
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    // We need the user — Paystack's charge event includes the email used
    // at checkout, so look up the matching auth user by email.
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const matchedUser = authUsers.users.find((u: { email: any; }) => u.email === data.customer.email);

    if (!matchedUser) {
      return NextResponse.json({ received: true });
    }

    const amount = data.amount / 100;
    const feePercent = Number(process.env.PARTAEY_PLATFORM_FEE_PERCENT ?? "5");
    const reservePercent = Number(process.env.PARTAEY_RESERVE_PERCENT ?? "15");
    const platformFee = Math.round(amount * feePercent) / 100;
    const organizerAmount = Math.round((amount - platformFee) * 100) / 100;
    const reserveAmount = Math.round(organizerAmount * reservePercent) / 100;
    const releaseAmount = Math.round((organizerAmount - reserveAmount) * 100) / 100;

    await admin.from("orders").insert({
      user_id: matchedUser.id,
      event_id,
      ticket_type_id,
      quantity: Number(quantity) || 1,
      amount,
      platform_fee: platformFee,
      organizer_amount: organizerAmount,
      reserve_amount: reserveAmount,
      release_amount: releaseAmount,
      payout_status: "held",
      paystack_reference: reference,
      status: "paid"
    });

    const { data: tier } = await admin
      .from("ticket_types")
      .select("quantity_sold")
      .eq("id", ticket_type_id)
      .single();

    await admin
      .from("ticket_types")
      .update({ quantity_sold: (tier?.quantity_sold ?? 0) + (Number(quantity) || 1) })
      .eq("id", ticket_type_id);
  }

  return NextResponse.json({ received: true });
}