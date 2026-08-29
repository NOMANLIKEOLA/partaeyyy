import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { businessName, bankCode, accountNumber } = await req.json();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!businessName || !bankCode || !accountNumber) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const feePercent = Number(process.env.PARTAEY_PLATFORM_FEE_PERCENT ?? "5");

  const paystackRes = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: feePercent
    })
  });

  const paystackJson = await paystackRes.json();

  if (!paystackJson.status) {
    return NextResponse.json(
      { error: paystackJson.message ?? "Paystack rejected the subaccount request" },
      { status: 400 }
    );
  }

  const subaccountCode = paystackJson.data.subaccount_code;

  const { error: updateError } = await supabase
    .from("users")
    .update({ paystack_subaccount_code: subaccountCode })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, subaccountCode });
}