import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { businessName, bankCode, bankName, accountNumber } = await req.json();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!businessName || !bankCode || !accountNumber) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const paystackRes = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "nuban",
      name: businessName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN"
    })
  });

  const json = await paystackRes.json();

  if (!json.status) {
    return NextResponse.json({ error: json.message ?? "Paystack rejected this account" }, { status: 400 });
  }

  const recipientCode = json.data.recipient_code;
  // Paystack resolves and returns the real account name on file at the
  // bank — a good sanity check that the account number wasn't mistyped.
  const accountName = json.data.details?.account_name ?? businessName;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      paystack_recipient_code: recipientCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recipientCode, accountName });
}