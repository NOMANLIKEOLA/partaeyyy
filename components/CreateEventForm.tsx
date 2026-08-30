"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventCategory } from "@/lib/types";
import { NIGERIA_STATES } from "@/lib/nigeria";

const CATEGORIES: EventCategory[] = [
  "Raves & nightlife",
  "Concerts",
  "Comedy",
  "Conferences",
  "Festivals",
  "Sports",
  "Meetups"
];

type TierDraft = { name: string; price: string; quantity: string };

export default function CreateEventForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [category, setCategory] = useState<EventCategory>("Raves & nightlife");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [needsTickets, setNeedsTickets] = useState(true);
  const [tiers, setTiers] = useState<TierDraft[]>([
    { name: "Regular", price: "", quantity: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTier(i: number, field: keyof TierDraft, value: string) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { name: "", price: "", quantity: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !date || !city) {
      setError("Title, date and city are required.");
      return;
    }

    let validTiers: TierDraft[] = [];
    if (needsTickets) {
      validTiers = tiers.filter((t) => t.name && t.price !== "" && t.quantity !== "");
      if (validTiers.length === 0) {
        setError("Add at least one ticket tier, or mark this as a free event with no tickets.");
        return;
      }
    }

    setSubmitting(true);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organizer_id: userId,
        title,
        description,
        category,
        city,
        venue,
        event_date: date,
        start_time: time || null,
        status: "published"
      })
      .select()
      .single();

    if (eventError || !event) {
      setError(eventError?.message ?? "Could not create event.");
      setSubmitting(false);
      return;
    }

    if (validTiers.length > 0) {
      const { error: tiersError } = await supabase.from("ticket_types").insert(
        validTiers.map((t) => ({
          event_id: event.id,
          name: t.name,
          price: Number(t.price),
          quantity: Number(t.quantity)
        }))
      );

      if (tiersError) {
        setSubmitting(false);
        setError(tiersError.message);
        return;
      }
    }

    setSubmitting(false);
    router.push(`/event/${event.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[13px] text-paperDim mb-2">Event title</label>
        <input
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Neon Lagoon — Amapiano All Night"
        />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`chip ${category === c ? "on" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-paperDim mb-2">Date</label>
          <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[13px] text-paperDim mb-2">Start time</label>
          <input type="time" className="field-input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Venue</label>
        <input className="field-input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Landmark Beach, Victoria Island" />
      </div>

      <div>
            <label className="block text-[13px] text-paperDim mb-2">State</label>
            <select className="field-input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Select a state</option>
              {NIGERIA_STATES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Description</label>
        <textarea
          className="field-input min-h-[90px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell people what to expect..."
        />
      </div>

      <div className="flex items-center justify-between bg-panel border border-hairline rounded-[10px] px-3.5 py-3">
        <div>
          <div className="text-sm font-medium">This event needs tickets</div>
          <div className="text-[12px] text-paperDim mt-0.5">Turn off for free, no-ticket events (RSVP only)</div>
        </div>
        <button
          type="button"
          onClick={() => setNeedsTickets((v) => !v)}
          className={`w-11 h-6 rounded-full relative transition ${needsTickets ? "bg-amber" : "bg-hairline"}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all ${needsTickets ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>

      {needsTickets && (
        <div>
          <label className="block text-[13px] text-paperDim mb-2">Ticket tiers</label>
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr] gap-2.5 mb-2.5">
              <input
                className="field-input"
                placeholder="Tier name (e.g. VIP)"
                value={t.name}
                onChange={(e) => updateTier(i, "name", e.target.value)}
              />
              <input
                className="field-input"
                type="number"
                min="0"
                placeholder="Price (₦)"
                value={t.price}
                onChange={(e) => updateTier(i, "price", e.target.value)}
              />
              <input
                className="field-input"
                type="number"
                min="0"
                placeholder="Quantity"
                value={t.quantity}
                onChange={(e) => updateTier(i, "quantity", e.target.value)}
              />
            </div>
          ))}
          <button type="button" onClick={addTier} className="text-[12.5px] text-teal">
            + Add another tier
          </button>
        </div>
      )}

      {error && <div className="text-[13px] text-coral">{error}</div>}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Publishing..." : "Publish event"}
      </button>
    </form>
  );
}