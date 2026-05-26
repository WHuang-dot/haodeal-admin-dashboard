create table if not exists public.read_channels (
  id uuid not null default gen_random_uuid (),
  channel text not null,
  category text null,
  note text null,
  created_at timestamp with time zone not null default now(),
  pipeline_kind text not null default 'deal'::text,
  constraint read_channels_pkey primary key (id),
  constraint read_channels_channel_key unique (channel),
  constraint read_channels_pipeline_kind_check check (
    (
      pipeline_kind = any (array['deal'::text, 'release'::text])
    )
  )
) tablespace pg_default;

create index if not exists idx_read_channels_category
on public.read_channels using btree (category) tablespace pg_default;

create index if not exists idx_read_channels_pipeline_kind
on public.read_channels using btree (pipeline_kind) tablespace pg_default;
