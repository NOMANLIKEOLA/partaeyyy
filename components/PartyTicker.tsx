"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function PartyTicker({ liveCount }: { liveCount: number }) {
  const reduceMotion = useReducedMotion();
  const items = [
    "🎉 LAGOS RAVES",
    "🎤 ABUJA CONCERTS",
    "😂 PH COMEDY NIGHTS",
    "🎪 FESTIVALS NATIONWIDE",
    `⚡ ${liveCount} EVENTS LIVE RIGHT NOW`,
    "🎧 AMAPIANO ALL NIGHT",
    "🏟️ SPORTS & MEETUPS"
  ];
  const track = [...items, ...items];

  return (
    <div className="border-b border-hairline bg-panel overflow-hidden">
      <motion.div
        className="flex gap-10 py-2.5 whitespace-nowrap w-max"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={reduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: "linear" }}
      >
        {track.map((item, i) => (
          <span key={i} className="text-[12px] font-mono tracking-wide text-amber/90">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}