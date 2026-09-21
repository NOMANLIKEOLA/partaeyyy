import crypto from "crypto";

export function generateTicketCode(): string {
  return crypto.randomBytes(16).toString("hex");
}