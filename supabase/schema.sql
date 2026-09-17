create table if not exists public.habit_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"habits":[],"goals":[],"accent":"#28c58b","dark":true}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.habit_data enable row level security;

create policy "Users can read their own habit data"
  on public.habit_data for select using (auth.uid() = user_id);

create policy "Users can create their own habit data"
  on public.habit_data for insert with check (auth.uid() = user_id);

create policy "Users can update their own habit data"
  on public.habit_data for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
