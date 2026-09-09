"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REASONS = [
  "This event looks fake or scammy",
  "Organizer isn't responding",
  "Wrong or misleading information",
  "Inappropriate content",
  "Other"
];

export default function ReportEventButton({ eventId, userId }: { eventId: string; userId: string | null }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    await supabase.from("event_reports").insert({
      event_id: eventId,
      reporter_id: userId,
      reason,
      details
    });
    setSubmitting(false);
    setDone(true);
  }

  if (!userId) return null;

  return (
    <div className="mt-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-[12px] text-paperDim underline">
          Report this event
        </button>
      ) : done ? (
        <div className="text-[12.5px] text-teal">Thanks — we'll take a look.</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-panel border border-hairline rounded-lg p-3.5 space-y-2.5">
          <select className="field-input !py-2 !text-[13px]" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea
            className="field-input !py-2 !text-[13px] min-h-[70px]"
            placeholder="Any extra details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary !py-2 !text-[13px] flex-1">
              {submitting ? "Sending..." : "Submit report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-2 !text-[13px]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}