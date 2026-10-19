import { createServiceClient } from "@/lib/supabase/server";

async function emailAdmin(subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return; // email alerts are optional

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL ?? "Partaey Alerts <onboarding@resend.dev>",
        to: [to],
        subject,
        text
      })
    });
  } catch {
    // An alert email failing must never break the job that raised it.
  }
}

// Records an alert and emails you, but only the first time a given key
// opens. Repeats of the same open problem stay quiet until it's resolved.
export async function raiseAlert(kind: string, message: string, dedupeKey: string): Promise<void> {
  const admin = createServiceClient();
  const { data: isNew, error } = await admin.rpc("raise_alert", {
    p_kind: kind,
    p_message: message,
    p_key: dedupeKey
  });

  if (error) {
    console.error("raise_alert failed:", error.message);
    return;
  }
  if (isNew) {
    await emailAdmin(`Partaey alert: ${kind}`, `${message}\n\nOpen Admin → Alerts on Partaey to review and resolve it.`);
  }
}