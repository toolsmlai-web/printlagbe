-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  company text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.quote_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  details text not null,
  status text default 'pending' check (status in ('pending', 'in_review', 'quoted', 'rejected')),
  quote_price decimal(10, 2),
  quote_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index if not exists idx_quote_requests_user_id on public.quote_requests(user_id);
create index if not exists idx_quote_requests_status on public.quote_requests(status);
create index if not exists idx_quote_requests_created_at on public.quote_requests(created_at);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Quote Requests RLS policies
create policy "Users can view their own quote requests"
  on public.quote_requests for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own quote requests"
  on public.quote_requests for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own quote requests"
  on public.quote_requests for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Create RPC function for quote requests
create or replace function public.create_quote_request(
  p_user_id uuid,
  p_details text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
begin
  if auth.uid() != p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.quote_requests (user_id, details)
  values (p_user_id, p_details)
  returning id into v_quote_id;

  return v_quote_id;
end;
$$;

-- Grant RPC execution to authenticated users
grant execute on function public.create_quote_request(uuid, text) to authenticated;

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
