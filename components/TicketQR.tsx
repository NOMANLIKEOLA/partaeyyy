"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TicketQR({ code }: { code: string }) {
  return (
    <div className="bg-white p-4 rounded-lg flex items-center justify-center">
      <QRCodeSVG value={code} size={160} />
    </div>
  );
}