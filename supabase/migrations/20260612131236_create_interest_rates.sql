create table public.interest_rates (
  id uuid default gen_random_uuid() primary key,
  payment_method varchar not null,
  rate_percentage numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.interest_rates enable row level security;

create policy "Enable all for authenticated users only" on public.interest_rates for all using (auth.role() = 'authenticated');
