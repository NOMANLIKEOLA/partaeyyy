"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SaveButton({
  eventId,
  userId,
  initiallySaved
}: {
  eventId: string;
  userId: string | null;
  initiallySaved: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [loading, setLoading] = useState(false);

  useEffect(() => setSaved(initiallySaved), [initiallySaved]);

  async function toggleSave() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setLoading(true);

    if (saved) {
      await supabase.from("saved_events").delete().eq("user_id", userId).eq("event_id", eventId);
      setSaved(false);
    } else {
      await supabase.from("saved_events").insert({ user_id: userId, event_id: eventId });
      setSaved(true);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`btn-ghost w-full mt-3 ${saved ? "border-amber text-amber" : ""}`}
    >
      {saved ? "★ Saved to bucket list" : "☆ Save to bucket list"}
    </button>
  );
}