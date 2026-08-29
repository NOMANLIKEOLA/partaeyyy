import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.paystack.co/bank?currency=NGN", {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const json = await res.json();

  if (!json.status) {
    return NextResponse.json({ error: "Could not load banks" }, { status: 500 });
  }

  const banks = json.data.map((b: any) => ({ name: b.name, code: b.code }));
  return NextResponse.json({ banks });
}