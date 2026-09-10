"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; photo_url: string };

export default function EventPhotoGallery({
  eventId,
  photos,
  canUpload,
  userId
}: {
  eventId: string;
  photos: Photo[];
  canUpload: boolean;
  userId: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${eventId}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-photos").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      const { data: publicUrlData } = supabase.storage.from("event-photos").getPublicUrl(path);
      await supabase.from("event_photos").insert({
        event_id: eventId,
        uploaded_by: userId,
        photo_url: publicUrlData.publicUrl
      });
    }

    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="mt-10 pt-8 border-t border-hairline">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-display">Event photos</h2>
        {canUpload && (
          <label className="btn-ghost cursor-pointer">
            {uploading ? "Uploading..." : "Add photos"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
          </label>
        )}
      </div>

      {error && <div className="text-[13px] text-coral mb-3">{error}</div>}

      {photos.length === 0 ? (
        <p className="text-paperDim text-[13.5px]">
          No photos yet.{canUpload ? " Add some once the event happens." : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightboxUrl(photo.photo_url)}
              className="aspect-square overflow-hidden rounded-lg bg-panel"
            >
              <img
                src={photo.photo_url}
                alt="Event photo"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" className="max-h-[85vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}