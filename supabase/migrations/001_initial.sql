begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  quantity integer not null check (quantity > 0),
  price_bdt numeric(12,2) not null check (price_bdt >= 0),
  is_demo boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_id uuid not null references public.products(id),
  zone_id uuid not null references public.service_zones(id),

  product_name text not null,
  quantity integer not null check (quantity > 0),
  print_price_bdt numeric(12,2) not null check (print_price_bdt >= 0),
  is_demo boolean not null,

  customer_name text not null,
  phone text not null,
  address text not null,
  artwork_path text,

  status text not null default 'quote_requested'
    check (
      status in (
        'quote_requested',
        'under_review',
        'awaiting_customer',
        'cancelled'
      )
    ),

  created_at timestamptz not null default now()
);

create index orders_user_created_idx
  on public.orders(user_id, created_at desc);

alter table public.products enable row level security;
alter table public.service_zones enable row level security;
alter table public.orders enable row level security;

revoke all on public.products from anon, authenticated;
revoke all on public.service_zones from anon, authenticated;
revoke all on public.orders from anon, authenticated;

grant select on public.products to anon, authenticated;
grant select on public.service_zones to anon, authenticated;
grant select on public.orders to authenticated;

create policy "Read active products"
on public.products for select
to anon, authenticated
using (active = true);

create policy "Read active service zones"
on public.service_zones for select
to anon, authenticated
using (active = true);

create policy "Read own orders"
on public.orders for select
to authenticated
using (user_id = (select auth.uid()));

insert into public.products
  (name, description, quantity, price_bdt, is_demo, sort_order)
values
  (
    'Visiting cards',
    'Demo package: 100 cards. Stock, finish, and dimensions require confirmation.',
    100, 450, true, 1
  ),
  (
    'A4 flyers',
    'Demo package: 100 flyers. Paper and print specifications require confirmation.',
    100, 950, true, 2
  ),
  (
    'PVC banner',
    'Demo package: one banner. Dimensions and finishing require confirmation.',
    1, 750, true, 3
  );

insert into public.service_zones (name)
values
  ('Dhanmondi — pilot eligibility check'),
  ('Mohammadpur — pilot eligibility check'),
  ('Tejgaon — pilot eligibility check');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'artwork',
  'artwork',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
);

create policy "Upload own artwork"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artwork'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Read own artwork"
on storage.objects for select
to authenticated
using (
  bucket_id = 'artwork'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- No client update or delete policy is provided for artwork.
-- This prevents accidental replacement of submitted source files.
-- A production retention/deletion workflow must be added separately.

create or replace function public.create_quote_request(
  p_product_id uuid,
  p_zone_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_artwork_path text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_product public.products%rowtype;
  v_order public.orders%rowtype;
begin
  v_user := auth.uid();

  if v_user is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize quote submissions from the same user so the simple
  -- daily limit cannot be bypassed with concurrent submissions.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text, 0)
  );

  if p_customer_name is null
     or char_length(trim(p_customer_name)) not between 2 and 100
  then
    raise exception 'Enter a valid customer name';
  end if;

  if p_phone is null
     or p_phone !~ '^(\+?88)?01[3-9][0-9]{8}$'
  then
    raise exception 'Enter a valid Bangladesh mobile number';
  end if;

  if p_address is null
     or char_length(trim(p_address)) not between 10 and 500
  then
    raise exception 'Enter a complete delivery address';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and active = true;

  if not found then
    raise exception 'Product is unavailable';
  end if;

  if not exists (
    select 1
    from public.service_zones
    where id = p_zone_id
      and active = true
  ) then
    raise exception 'Delivery area is unavailable';
  end if;

  if (
    select count(*)
    from public.orders
    where user_id = v_user
      and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Daily request limit reached. Please contact support.';
  end if;

  if p_artwork_path is not null then
    if split_part(p_artwork_path, '/', 1) <> v_user::text then
      raise exception 'Invalid artwork ownership';
    end if;

    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'artwork'
        and name = p_artwork_path
    ) then
      raise exception 'Artwork upload was not found';
    end if;
  end if;

  insert into public.orders (
    user_id,
    product_id,
    zone_id,
    product_name,
    quantity,
    print_price_bdt,
    is_demo,
    customer_name,
    phone,
    address,
    artwork_path
  )
  values (
    v_user,
    v_product.id,
    p_zone_id,
    v_product.name,
    v_product.quantity,
    v_product.price_bdt,
    v_product.is_demo,
    trim(p_customer_name),
    p_phone,
    trim(p_address),
    p_artwork_path
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.create_quote_request(
  uuid, uuid, text, text, text, text
) from public, anon;

grant execute on function public.create_quote_request(
  uuid, uuid, text, text, text, text
) to authenticated;

commit;
