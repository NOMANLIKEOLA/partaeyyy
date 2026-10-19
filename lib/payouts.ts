import { createServiceClient } from "@/lib/supabase/server";
import { raiseAlert } from "@/lib/alerts";

export type Stage = "main" | "reserve";
export type PayoutResult = {
  status: "success" | "pending" | "failed" | "skipped";
  message?: string;
};

const OTP_MESSAGE =
  "Paystack is asking for an OTP to confirm transfers. Ask Paystack support to disable OTP for API transfers on your account.";

const naira = (n: number) => `₦${Number(n).toLocaleString()}`;
const nameOf = (u: any): string | null => (Array.isArray(u) ? u[0]?.full_name : u?.full_name) ?? null;

async function paystack(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json"
    }
  });
  const json = await res.json().catch(() => ({}));
  return { httpStatus: res.status, json };
}

function interpret(status?: string): "success" | "failed" | "otp" | "pending" {
  switch (status) {
    case "success":
      return "success";
    case "failed":
    case "reversed":
      return "failed";
    case "otp":
      return "otp";
    default:
      return "pending"; // pending, received, processing...
  }
}

async function failPayout(args: {
  reference: string;
  organizerId: string;
  name: string | null;
  stage: Stage;
  amount: number;
  reason: string;
}) {
  const admin = createServiceClient();
  await admin.rpc("settle_payout", {
    p_reference: args.reference,
    p_outcome: "failed",
    p_reason: args.reason
  });
  await raiseAlert(
    "payout_failed",
    `A ${args.stage === "main" ? "ticket sales" : "reserve"} payout of ${naira(args.amount)} to ${args.name ?? "an organizer"} failed: ${args.reason} Those orders are free to retry on the next run.`,
    `payout:${args.organizerId}:${args.stage}`
  );
}

async function settleSuccess(reference: string, transferCode?: string) {
  const admin = createServiceClient();
  await admin.rpc("settle_payout", {
    p_reference: reference,
    p_outcome: "success",
    p_transfer_code: transferCode ?? null
  });
}

// Pays one organizer for a set of orders. The orders are attached to a
// payout record (with a unique reference) BEFORE any money moves, so a
// crash or a repeat run can never pay the same orders twice.
export async function payOrganizer(params: {
  organizerId: string;
  stage: Stage;
  orderIds: string[];
}): Promise<PayoutResult> {
  const admin = createServiceClient();
  const { organizerId, stage, orderIds } = params;

  const { data: organizer } = await admin
    .from("users")
    .select("paystack_recipient_code, full_name")
    .eq("id", organizerId)
    .single();

  if (!organizer?.paystack_recipient_code) {
    await raiseAlert(
      "payout_no_account",
      `${organizer?.full_name ?? "An organizer"} has ${orderIds.length} order(s) ready to pay out but hasn't connected a payout account.`,
      `noaccount:${organizerId}`
    );
    return { status: "skipped", message: "Organizer has no payout account connected." };
  }

  const { data: rows, error } = await admin.rpc("begin_payout", {
    p_organizer: organizerId,
    p_stage: stage,
    p_order_ids: orderIds
  });
  if (error) throw new Error(error.message);

  const payout = rows?.[0];
  if (!payout) return { status: "skipped", message: "Nothing eligible to pay." };

  const reference: string = payout.out_reference;
  const amount = Number(payout.out_amount);

  let response;
  try {
    response = await paystack("/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100),
        recipient: organizer.paystack_recipient_code,
        reason: stage === "main" ? "Partaey ticket sales payout" : "Partaey reserve payout",
        reference
      })
    });
  } catch {
    // We can't tell whether Paystack received it. Leave it pending;
    // reconcilePendingPayouts checks by reference and resolves it.
    return { status: "pending", message: "Network error. Will be reconciled." };
  }

  const { json } = response;
  const failArgs = { reference, organizerId, name: organizer.full_name, stage, amount };

  if (!json.status) {
    const reason = json.message ?? "Paystack rejected the transfer.";
    await failPayout({ ...failArgs, reason });
    return { status: "failed", message: reason };
  }

  const outcome = interpret(json.data?.status);
  if (outcome === "success") {
    await settleSuccess(reference, json.data?.transfer_code);
    return { status: "success" };
  }
  if (outcome === "otp") {
    await failPayout({ ...failArgs, reason: OTP_MESSAGE });
    return { status: "failed", message: OTP_MESSAGE };
  }
  if (outcome === "failed") {
    const reason = json.data?.reason ?? "Transfer failed.";
    await failPayout({ ...failArgs, reason });
    return { status: "failed", message: reason };
  }

  // Accepted but not finished. The webhook (or reconciliation) settles it.
  const admin2 = createServiceClient();
  await admin2.from("payouts").update({ transfer_code: json.data?.transfer_code }).eq("reference", reference);
  return { status: "pending" };
}

// Resolves payouts that never got a final answer: a missed webhook, a
// crash after the transfer was sent, a dropped connection.
export async function reconcilePendingPayouts(): Promise<void> {
  const admin = createServiceClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: pending } = await admin
    .from("payouts")
    .select("reference, amount, stage, organizer_id, created_at, users:organizer_id(full_name)")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const p of pending ?? []) {
    let res;
    try {
      res = await paystack(`/transfer/verify/${encodeURIComponent(p.reference)}`);
    } catch {
      continue;
    }

    // Paystack has no record: it was never sent, so free the orders to retry.
    if (res.httpStatus === 404) {
      await admin.rpc("settle_payout", {
        p_reference: p.reference,
        p_outcome: "failed",
        p_reason: "Transfer was never sent to Paystack"
      });
      continue;
    }
    if (!res.json.status) continue;

    const failArgs = {
      reference: p.reference,
      organizerId: p.organizer_id,
      name: nameOf(p.users),
      stage: p.stage as Stage,
      amount: Number(p.amount)
    };
    const outcome = interpret(res.json.data?.status);

    if (outcome === "success") {
      await settleSuccess(p.reference, res.json.data?.transfer_code);
    } else if (outcome === "failed") {
      await failPayout({ ...failArgs, reason: res.json.data?.reason ?? "Transfer failed." });
    } else if (outcome === "otp") {
      await failPayout({ ...failArgs, reason: OTP_MESSAGE });
    } else if (Date.now() - new Date(p.created_at).getTime() > 24 * 60 * 60 * 1000) {
      await raiseAlert(
        "payout_stuck",
        `A payout of ${naira(failArgs.amount)} to ${failArgs.name ?? "an organizer"} (reference ${p.reference}) has been pending for over 24 hours.`,
        `stuck:${p.reference}`
      );
    }
  }
}

// Called by the Paystack webhook for transfer.success / failed / reversed.
export async function handleTransferWebhook(type: "success" | "failed" | "reversed", data: any): Promise<void> {
  const admin = createServiceClient();
  const reference: string | undefined = data?.reference;
  if (!reference) return;

  const { data: payout } = await admin
    .from("payouts")
    .select("reference, amount, stage, organizer_id, status, users:organizer_id(full_name)")
    .eq("reference", reference)
    .maybeSingle();
  if (!payout) return; // not one of ours

  if (type === "success") {
    await settleSuccess(reference, data.transfer_code);
    return;
  }

  const reason = data.reason ?? (type === "reversed" ? "The transfer was reversed." : "The transfer failed.");

  if (payout.status === "pending") {
    await failPayout({
      reference,
      organizerId: payout.organizer_id,
      name: nameOf(payout.users),
      stage: payout.stage as Stage,
      amount: Number(payout.amount),
      reason
    });
  } else if (payout.status === "success" && type === "reversed") {
    await raiseAlert(
      "payout_reversed",
      `A payout of ${naira(Number(payout.amount))} to ${nameOf(payout.users) ?? "an organizer"} (reference ${reference}) was reversed AFTER being marked paid. The money is back in your Paystack balance, but the orders still show as released. This needs manual handling.`,
      `reversed:${reference}`
    );
  }
}