-- Every table below gets Row Level Security enabled explicitly,
-- right after creation — this locks each table down by default,
-- same effect as the dashboard's "Automatic RLS" setting.
-- The policies further down are what open access back up, deliberately.

create table if not exists users (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  state text,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  city text not null,
  venue text,
  event_date date not null,
  start_time time,
  cover_image_url text,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz default now()
);

create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  price numeric not null check (price >= 0),
  quantity int not null check (quantity >= 0),
  quantity_sold int not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  ticket_type_id uuid references ticket_types(id),
  quantity int not null check (quantity > 0),
  amount numeric not null,
  paystack_reference text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz default now()
);

create