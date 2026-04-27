-- Add image_data column to inventory for slab photos (base64 data URL or URL)
alter table inventory
  add column if not exists image_data text;

-- Also ensure slab dimension columns exist (some environments may not have them yet)
alter table inventory
  add column if not exists slab_width     numeric(10,2),
  add column if not exists slab_height    numeric(10,2),
  add column if not exists slab_thickness numeric(10,2);
