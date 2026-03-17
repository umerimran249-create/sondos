-- ============================================================
-- Stone ERP — Full Schema Deploy
-- Run this once in Supabase SQL Editor
-- ============================================================

-- 1. ROLES & PERMISSIONS
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text
);

create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null,
  full_name text,
  role_id uuid references roles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  logged_in_at timestamptz default now(),
  ip_address inet,
  session_duration_seconds integer
);

-- 2. STORAGE FILES (must come before system_parameters)
create table if not exists storage_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  file_type text,
  description text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- 3. SYSTEM SETUP
create table if not exists system_parameters (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  logo_file_id uuid references storage_files(id),
  tax_settings jsonb,
  invoice_format jsonb,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists dropdown_values (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  code text not null,
  label text not null,
  sort_order integer default 0,
  active boolean default true,
  unique (category, code)
);

create table if not exists delivery_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  name text not null,
  details jsonb,
  active boolean default true
);

create table if not exists warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  location_type text not null,
  code text not null,
  description text,
  unique (location_type, code)
);

-- 4. CUSTOMERS & CRM
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null unique,
  name text not null,
  phone text,
  email text,
  billing_address jsonb,
  customer_type text,
  credit_limit numeric(12,2) default 0,
  notes text,
  status text default 'active',
  is_locked boolean default false,
  overdue_balance numeric(12,2) default 0,
  po_required boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists customer_shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  label text,
  address jsonb,
  is_default boolean default false
);

create table if not exists customer_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  message text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists prospective_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  source text,
  notes text,
  status text default 'new',
  created_at timestamptz default now()
);

-- 5. PRODUCTS & INVENTORY
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique,
  product_name text not null,
  sku text,
  alternate_names text[],
  color text,
  country_of_origin text,
  product_group text,
  size jsonb,
  weight numeric(10,2),
  unit_type text,
  base_cost numeric(12,2),
  price_levels numeric(12,2)[],
  preferred_supplier text,
  accounting_defaults jsonb,
  reorder_level numeric(12,2),
  safety_stock numeric(12,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  file_id uuid references storage_files(id),
  sort_order integer default 0
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  inventory_id text not null unique,
  product_id uuid references products(id),
  lot_number text,
  bundle_number text,
  barcode text unique,
  supplier_reference text,
  warehouse_bin uuid references warehouse_locations(id),
  quantity numeric(12,3),
  sqft numeric(12,3),
  status text default 'available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id) on delete cascade,
  transaction_type text not null,
  quantity_delta numeric(12,3),
  sqft_delta numeric(12,3),
  reference_type text,
  reference_id uuid,
  created_at timestamptz default now(),
  created_by uuid references users(id)
);

-- 6. QUOTES & JOBS
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  quote_id text not null unique,
  customer_id uuid references customers(id),
  sales_rep uuid references users(id),
  quote_date date default current_date,
  status text default 'draft',
  total_amount numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  product_id uuid references products(id),
  description text,
  quantity numeric(12,3) default 1,
  unit_price numeric(12,2) default 0,
  sqft numeric(12,3),
  linear_feet numeric(12,3),
  waste_factor numeric(5,2),
  line_total numeric(12,2) default 0
);

create table if not exists quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  revision_number integer,
  data jsonb,
  created_at timestamptz default now(),
  created_by uuid references users(id),
  unique (quote_id, revision_number)
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  quote_id uuid references quotes(id),
  customer_id uuid references customers(id),
  status text default 'pending',
  contract_file_id uuid references storage_files(id),
  deposit_amount numeric(12,2) default 0,
  waste_factor numeric(5,2) default 10,
  remnant_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists job_schedule_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  stage text not null,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  calendar_type text,
  notes text
);

-- 7. HOLDS
create table if not exists holds (
  id uuid primary key default gen_random_uuid(),
  hold_id text not null unique,
  product_id uuid references products(id),
  customer_id uuid references customers(id),
  hold_date date default current_date,
  expiry_date date,
  sales_rep uuid references users(id),
  notes text,
  is_active boolean default true,
  archived boolean default false,
  created_at timestamptz default now()
);

-- 8. SALES ORDERS & DELIVERIES
create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references customers(id),
  quote_id uuid references quotes(id),
  status text default 'pending',
  deposit_amount numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid references sales_orders(id) on delete cascade,
  product_id uuid references products(id),
  description text,
  quantity numeric(12,3),
  unit_price numeric(12,2),
  line_total numeric(12,2),
  fulfilled_quantity numeric(12,3) default 0
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_number text not null unique,
  sales_order_id uuid references sales_orders(id),
  status text default 'not_ready',
  scheduled_date date,
  route_id uuid references delivery_resources(id),
  truck_id uuid references delivery_resources(id),
  driver_name text,
  documents jsonb,
  created_at timestamptz default now()
);

-- 9. PURCHASING
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_name text not null,
  status text default 'draft',
  order_type text default 'sqft',
  expected_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity numeric(12,3),
  unit_cost numeric(12,2),
  lot_number text,
  bundle_number text,
  block_number text,
  supplier_reference text
);

-- 10. LAYOUTS (drawing tool)
create table if not exists layouts (
  id uuid primary key default gen_random_uuid(),
  name text,
  quote_id uuid references quotes(id),
  customer_id uuid references customers(id),
  job_id uuid references jobs(id),
  canvas_json text,
  layout_data jsonb,
  png_file_id uuid references storage_files(id),
  sqft numeric(12,3),
  linear_feet numeric(12,3),
  slab_estimate integer,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. REPORTS
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  definition jsonb,
  created_at timestamptz default now()
);

-- 12. SEED DATA

-- Default roles
insert into roles (name, description) values
  ('Admin',      'Full system access'),
  ('Sales',      'Quotes, customers, holds, orders'),
  ('Fabricator', 'Jobs, scheduling, drawing tool'),
  ('Warehouse',  'Inventory, receiving, deliveries'),
  ('Accounting', 'Invoices, reports, financials')
on conflict (name) do nothing;

-- Default dropdown values
insert into dropdown_values (category, code, label, sort_order) values
  ('customer_type','fabricator','Fabricator',1),
  ('customer_type','homeowner','Homeowner',2),
  ('customer_type','designer','Designer',3),
  ('customer_type','contractor','Contractor',4),
  ('material_type','granite','Granite',1),
  ('material_type','quartz','Quartz',2),
  ('material_type','marble','Marble',3),
  ('material_type','quartzite','Quartzite',4),
  ('finish_type','polished','Polished',1),
  ('finish_type','honed','Honed',2),
  ('finish_type','leathered','Leathered',3),
  ('country','brazil','Brazil',1),
  ('country','italy','Italy',2),
  ('country','india','India',3),
  ('country','usa','USA',4),
  ('product_group','slab','Slab',1),
  ('product_group','tile','Tile',2),
  ('product_group','sink','Sink',3),
  ('product_group','accessory','Accessory',4)
on conflict (category, code) do nothing;

-- Default reports
insert into reports (code, name, category) values
  ('cust_profitability',  'Customer Profitability',      'customers'),
  ('cust_top',            'Top Customers by Sales',      'customers'),
  ('cust_sales_summary',  'Customer Sales Summary',      'customers'),
  ('cust_statements',     'Customer Statements',         'customers'),
  ('inv_valuation',       'Inventory Valuation',         'inventory'),
  ('inv_aging',           'Inventory Aging Analysis',    'inventory'),
  ('inv_fast_moving',     'Fast Moving Products',        'inventory'),
  ('inv_reorder',         'Reorder Qty Report',          'inventory'),
  ('acc_receivable',      'Accounts Receivable',         'accounting'),
  ('acc_payable',         'Accounts Payable',            'accounting'),
  ('acc_trial_balance',   'GL Trial Balance',            'accounting'),
  ('acc_sales_tax',       'Sales Tax Report',            'accounting'),
  ('fin_balance_sheet',   'Balance Sheet',               'financial'),
  ('fin_income_stmt',     'Income Statement',            'financial'),
  ('fin_cash_flow',       'Cash Flow Statement',         'financial'),
  ('sales_by_rep',        'Sales by Rep',                'sales'),
  ('sales_summary',       'Sales Summary',               'sales'),
  ('sales_profitability', 'Sales Profitability',         'sales'),
  ('sales_commission',    'Commission Report',           'sales')
on conflict (code) do nothing;

-- ============================================================
-- Done! All tables, roles, dropdowns and reports created.
-- ============================================================
