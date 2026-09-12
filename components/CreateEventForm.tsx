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

type TierDraft = { name: string; price: string; quantity: string };

export default function CreateEventForm({
  userId,
  hasPhone,
  hasName
}: {
  userId: string;
  hasPhone: boolean;
  hasName: boolean;
}) {
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
  const [is18Plus, setIs18Plus] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [tiers, setTiers] = useState<TierDraft[]>([
    { name: "Regular", price: "", quantity: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReviewNotice, setPendingReviewNotice] = useState(false);

  function handleCategoryChange(c: EventCategory) {
    setCategory(c);
    if (c === "Raves & nightlife") setIs18Plus(true);
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setGalleryFiles((prev) => [...prev, ...files]);
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeGalleryPhoto(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTier(i: number, field: keyof TierDraft, value: string) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { name: "", price: "", quantity: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasName) {
      setError("Add your name to your profile before listing an event.");
      return;
    }

    if (!title || !date || !city) {
      setError("Title, date and state are required.");
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

    if (needsTickets && !hasPhone) {
      setError("Add a phone number to your profile before listing paid events.");
      return;
    }

    setSubmitting(true);

    let coverImageUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-covers").upload(path, coverFile);

      if (uploadError) {
        setError(`Cover image upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("event-covers").getPublicUrl(path);
      coverImageUrl = publicUrlData.publicUrl;
    }

    // A first-time organizer's first PAID event goes to manual review
    // before it's publicly visible.
    const hasPaidTier = needsTickets && tiers.some((t) => Number(t.price) > 0);
    let needsReview = false;
    if (hasPaidTier) {
      const { count: priorEventCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", userId);
      needsReview = (priorEventCount ?? 0) === 0;
    }

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
        cover_image_url: coverImageUrl,
        is_18_plus: is18Plus,
        pending_review: needsReview,
        status: needsReview ? "draft" : "published"
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

    // Upload any extra gallery photos now that we have the event's ID.
    for (const file of galleryFiles) {
      const ext = file.name.split(".").pop();
      const path = `${event.id}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: photoUploadError } = await supabase.storage.from("event-photos").upload(path, file);
      if (photoUploadError) continue; // don't block publishing over a gallery photo failing
      const { data: publicUrlData } = supabase.storage.from("event-photos").getPublicUrl(path);
      await supabase.from("event_photos").insert({
        event_id: event.id,
        uploaded_by: userId,
        photo_url: publicUrlData.publicUrl
      });
    }

    setSubmitting(false);

    if (needsReview) {
      setPendingReviewNotice(true);
      return;
    }

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
              onClick={() => handleCategoryChange(c)}
              className={`chip ${category === c ? "on" : ""}`}
            >
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

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Cover image</label>
        <p className="text-[12px] text-paperDim mb-2">This is the big banner shown at the top of your event page.</p>
        <label className="block border border-dashed border-hairline rounded-xl p-6 text-center text-paperDim text-[13px] cursor-pointer hover:border-amber transition">
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="max-h-[160px] mx-auto rounded-lg" />
          ) : (
            "Click to upload an image · 1200×630 recommended"
          )}
        </label>
      </div>

      <div>
        <label className="block text-[13px] text-paperDim mb-2">Event photos</label>
        <p className="text-[12px] text-paperDim mb-2">
          Extra photos — venue shots, lineup flyer, past editions. Shown in the gallery on your event page.
        </p>

        {galleryPreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {galleryPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-panel">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryPhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 text-paper text-[11px] flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="block border border-dashed border-hairline rounded-xl p-5 text-center text-paperDim text-[13px] cursor-pointer hover:border-amber transition">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryChange} />
          + Add photos
        </label>
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
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all ${needsTickets ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      <div className="flex items-center justify-between bg-panel border border-hairline rounded-[10px] px-3.5 py-3">
        <div>
          <div className="text-sm font-medium">18+ only</div>
          <div className="text-[12px] text-paperDim mt-0.5">Attendees under 18 won't be able to get tickets</div>
        </div>
        <button
          type="button"
          onClick={() => setIs18Plus((v) => !v)}
          className={`w-11 h-6 rounded-full relative transition ${is18Plus ? "bg-amber" : "bg-hairline"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all ${is18Plus ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {needsTickets && (
        <div>
          <label className="block text-[13px] text-paperDim mb-2">Ticket tiers</label>
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr] gap-2 sm:gap-2.5 mb-2.5">
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

      {pendingReviewNotice ? (
        <div className="bg-panel2 border border-hairline rounded-card p-5 text-center">
          <div className="text-teal font-medium mb-1.5">Event submitted for review</div>
          <p className="text-paperDim text-[13px]">
            Since this is your first paid event, we're giving it a quick look before it goes live — usually
            within 24 hours. You'll find it under "My events" once approved.
          </p>
        </div>
      ) : (
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Publishing..." : "Publish event"}
        </button>
      )}
    </form>
  );
}