-- Shape Template Library — stores custom countertop shapes with optional images
create table if not exists shape_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  kind              text not null default 'countertop', -- countertop | island | backsplash | cutout
  stroke_color      text not null default '#D4AF37',
  image_data        text,           -- base64 data URL (compressed thumbnail)
  default_width_ft  numeric(10,4)  not null default 2.5,
  default_height_ft numeric(10,4)  not null default 1.0,
  default_corners   integer        default 4,
  normalized_points jsonb,          -- [{x,y}] array, 0–1 coords for polygon outline
  sort_order        integer        default 0,
  created_at        timestamptz    default now()
);
