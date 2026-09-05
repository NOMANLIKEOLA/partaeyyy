"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIGERIA_STATES } from "@/lib/nigeria";
import type { EventCategory } from "@/lib/types";

const CATEGORIES: EventCategory[] = [
  "Raves & nightlife",
  "Concerts",
  "Comedy",
  "Conferences",
  "Festivals",
  "Sports",
  "Meetups"
];

export default function EditEventForm({ event }: { event: any }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [date, setDate] = useState(event.event_date);
  const [time, setTime] = useState(event.start_time ?? "");
  const [venue, setVenue] = useState(event.venue ?? "");
  const [city, setCity] = useState(event.city);
  const [description, setDescription] = useState(event.description ?? "");
  const [is18Plus, setIs18Plus] = useState(event.is_18_plus);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(event.cover_image_url);
  const [tiers, setTiers] = useState(
    event.ticket_types.map((t: any) => ({ id: t.id, name: t.name, price: String(t.price), quantity: String(t.quantity), quantity_sold: t.quantity_sold }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  function updateTier(i: number, field: "price" | "quantity", value: string) {
    setTiers((prev: any) => prev.map((t: any, idx: number) => (idx === i ? { ...t, [field]: value } : t)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    let coverImageUrl = event.cover_image_url;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${event.organizer_id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-covers").upload(path, coverFile);
      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("event-covers").getPublicUrl(path);
      coverImageUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({
        title,
        category,
        event_date: date,
        start_time: time || null,
        venue,
        city,
        description,
        is_18_plus: is18Plus,
        cover_image_url: coverImageUrl
      })
      .eq("id", event.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    for (const t of tiers) {
      const newQty = Number(t.quantity);
      if (newQty < t.quantity_sold) {
        setError(`"${t.name}" can't be set below ${t.quantity_sold} — that many are already sold.`);
        setSaving(false);
        return;
      }
      await supabase
        .from("ticket_types")
        .update({ price: Number(t.price), quantity: newQty })
        .eq("id", t.id);
    }

    setSaving(false);
    router.push("/my-events");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[13px] text-paperDim mb-2">Event title</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button type="button" key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? "on" : ""}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <input className="field-input" value={venue} onChange={(e) => setVenue(e.target.value)} />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">State</label>
        <select className="field-input" value={city} onChange={(e) => setCity(e.target.value)}>
          {NIGERIA_STATES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Description</label>
        <textarea className="field-input min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Cover image</label>
        <label className="block border border-dashed border-hairline rounded-xl p-6 text-center text-paperDim text-[13px] cursor-pointer hover:border-amber transition">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="max-h-[160px] mx-auto rounded-lg" />
          ) : (
            "Click to upload an image"
          )}
        </label>
      </div>

      <div className="flex items-center justify-between bg-panel border border-hairline rounded-[10px] px-3.5 py-3">
        <div>
          <div className="text-sm font-medium">18+ only</div>
          <div className="text-[12px] text-paperDim mt-0.5">Attendees under 18 won't be able to get tickets</div>
        </div>
        <button
          type="button"
          onClick={() => setIs18Plus((v: boolean) => !v)}
          className={`w-11 h-6 rounded-full relative transition ${is18Plus ? "bg-amber" : "bg-hairline"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all ${is18Plus ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {tiers.length > 0 && (
        <div>
          <label className="block text-[13px] text-paperDim mb-2">Ticket tiers</label>
          {tiers.map((t: any, i: number) => (
            <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr] gap-2 sm:gap-2.5 mb-2.5 items center">
              <div className="text-sm">{t.name}</div>
              <input className="field-input" type="number" min="0" value={t.price} onChange={(e) => updateTier(i, "price", e.target.value)} />
              <input className="field-input" type="number" min={t.quantity_sold} value={t.quantity} onChange={(e) => updateTier(i, "quantity", e.target.value)} />
            </div>
          ))}
          <p className="text-[11.5px] text-paperDim">Quantity can't go below tickets already sold.</p>
        </div>
      )}

      {error && <div className="text-[13px] text-coral">{error}</div>}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}