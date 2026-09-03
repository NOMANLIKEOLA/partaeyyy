export type EventCategory =
  | "Raves & nightlife"
  | "Concerts"
  | "Comedy"
  | "Conferences"
  | "Festivals"
  | "Sports"
  | "Meetups";

export interface PartaeyEvent {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  city: string;
  venue: string | null;
  event_date: string;
  start_time: string | null;
  cover_image_url: string | null;
  is_18_plus: boolean;
  status: "draft" | "published";
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
}

export interface Order {
  id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  amount: number;
  paystack_reference: string | null;
  status: "pending" | "paid" | "failed";
  created_at: string;
}