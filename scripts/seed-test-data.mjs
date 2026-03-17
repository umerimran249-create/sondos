import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }

const s = createClient(url, key);

console.log('Seeding test data…\n');

// CUSTOMERS
const { data: customers } = await s.from('customers').insert([
  { customer_id:'CUST-001', name:'Johnson Kitchen & Bath', phone:'336-555-0101', email:'johnson@jkb.com', customer_type:'homeowner',  credit_limit:15000, status:'active', notes:'Preferred customer, quick payment' },
  { customer_id:'CUST-002', name:'Elite Stone Designs',    phone:'704-555-0202', email:'orders@elitestone.com', customer_type:'fabricator', credit_limit:50000, status:'active', notes:'Large volume orders' },
  { customer_id:'CUST-003', name:'Rivera Interior Studio', phone:'919-555-0303', email:'mrivera@ristudio.com', customer_type:'designer',   credit_limit:25000, status:'active', notes:'High-end residential projects' },
  { customer_id:'CUST-004', name:'Summit Builders LLC',    phone:'828-555-0404', email:'procurement@summitbuild.com', customer_type:'contractor', credit_limit:75000, status:'active', notes:'Commercial contractor' },
  { customer_id:'CUST-005', name:'Grace Homeowner',        phone:'336-555-0505', email:'grace@email.com', customer_type:'homeowner', credit_limit:8000, status:'active', notes:'Kitchen remodel' },
]).select();
console.log('✓ Customers:', customers?.length);

// PRODUCTS
const { data: products } = await s.from('products').insert([
  { product_id:'PROD-001', product_name:'Absolute Black Granite', sku:'ABG-SLB', color:'Black', country_of_origin:'India',   product_group:'slab', unit_type:'sqft', base_cost:12, price_levels:[18,20,22,24,26,28] },
  { product_id:'PROD-002', product_name:'Calacatta Gold Marble',  sku:'CGM-SLB', color:'White/Gold', country_of_origin:'Italy',   product_group:'slab', unit_type:'sqft', base_cost:38, price_levels:[55,60,65,70,75,80] },
  { product_id:'PROD-003', product_name:'Cambria Quartz White',   sku:'CQW-SLB', color:'White', country_of_origin:'USA',    product_group:'slab', unit_type:'sqft', base_cost:28, price_levels:[42,46,50,54,58,62] },
  { product_id:'PROD-004', product_name:'Azul Bahia Granite',     sku:'ABH-SLB', color:'Blue', country_of_origin:'Brazil',  product_group:'slab', unit_type:'sqft', base_cost:22, price_levels:[32,36,40,44,48,52] },
  { product_id:'PROD-005', product_name:'Blanco Sink 33"',        sku:'BLK-SNK', color:'White', country_of_origin:'USA',    product_group:'sink', unit_type:'each', base_cost:180, price_levels:[250,260,270,280,290,300] },
]).select();
console.log('✓ Products:', products?.length);

// INVENTORY
const { data: inventory } = await s.from('inventory').insert([
  { inventory_id:'INV-001', product_id:products[0].id, lot_number:'LOT-2024-001', bundle_number:'BND-01', barcode:'8800000001', quantity:4, sqft:240, status:'available' },
  { inventory_id:'INV-002', product_id:products[0].id, lot_number:'LOT-2024-001', bundle_number:'BND-02', barcode:'8800000002', quantity:3, sqft:185, status:'available' },
  { inventory_id:'INV-003', product_id:products[1].id, lot_number:'LOT-2024-002', bundle_number:'BND-01', barcode:'8800000003', quantity:2, sqft:130, status:'available' },
  { inventory_id:'INV-004', product_id:products[2].id, lot_number:'LOT-2024-003', bundle_number:'BND-01', barcode:'8800000004', quantity:5, sqft:310, status:'available' },
  { inventory_id:'INV-005', product_id:products[3].id, lot_number:'LOT-2024-004', bundle_number:'BND-01', barcode:'8800000005', quantity:3, sqft:195, status:'on_hold'   },
  { inventory_id:'INV-006', product_id:products[1].id, lot_number:'LOT-2024-005', bundle_number:'BND-02', barcode:'8800000006', quantity:1, sqft:62,  status:'reserved'  },
]).select();
console.log('✓ Inventory:', inventory?.length);

// QUOTES
const { data: quotes } = await s.from('quotes').insert([
  { quote_id:'Q-2026-001', customer_id:customers[0].id, quote_date:'2026-03-01', status:'approved', total_amount:4850.00, notes:'Kitchen island + perimeter countertops, Calacatta Gold' },
  { quote_id:'Q-2026-002', customer_id:customers[1].id, quote_date:'2026-03-05', status:'sent',     total_amount:12200.00, notes:'Full commercial kitchen, Absolute Black Granite' },
  { quote_id:'Q-2026-003', customer_id:customers[2].id, quote_date:'2026-03-10', status:'draft',    total_amount:3300.00, notes:'Master bath vanity, Cambria Quartz' },
  { quote_id:'Q-2026-004', customer_id:customers[3].id, quote_date:'2026-03-12', status:'approved', total_amount:28500.00, notes:'Hotel lobby feature wall, Azul Bahia' },
]).select();
console.log('✓ Quotes:', quotes?.length);

// QUOTE ITEMS
await s.from('quote_items').insert([
  { quote_id:quotes[0].id, description:'Calacatta Gold Marble — Island (42 sqft)', quantity:1, unit_price:2730, line_total:2730 },
  { quote_id:quotes[0].id, description:'Calacatta Gold Marble — Perimeter (32 sqft)', quantity:1, unit_price:2080, line_total:2080 },
  { quote_id:quotes[0].id, description:'Sink Cutout (1x)', quantity:1, unit_price:160, line_total:160 },
  { quote_id:quotes[1].id, description:'Absolute Black Granite — 188 sqft', quantity:1, unit_price:11280, line_total:11280 },
  { quote_id:quotes[1].id, description:'Edge labor — 94 lf', quantity:1, unit_price:846, line_total:846 },
  { quote_id:quotes[2].id, description:'Cambria Quartz White — Vanity top (22 sqft)', quantity:1, unit_price:3300, line_total:3300 },
]);
console.log('✓ Quote items seeded');

// JOBS
const { data: jobs } = await s.from('jobs').insert([
  { job_number:'JOB-2026-001', quote_id:quotes[0].id, customer_id:customers[0].id, status:'cutting',      deposit_amount:2425, waste_factor:12 },
  { job_number:'JOB-2026-002', quote_id:quotes[1].id, customer_id:customers[1].id, status:'templating',   deposit_amount:6100, waste_factor:10 },
  { job_number:'JOB-2026-003', quote_id:quotes[3].id, customer_id:customers[3].id, status:'installation', deposit_amount:14250, waste_factor:8 },
  { job_number:'JOB-2026-004', customer_id:customers[2].id,                         status:'pending',      deposit_amount:1650, waste_factor:10 },
]).select();
console.log('✓ Jobs:', jobs?.length);

// HOLDS
const { data: holds } = await s.from('holds').insert([
  { hold_id:'HLD-001', product_id:products[1].id, customer_id:customers[0].id, hold_date:'2026-03-10', expiry_date:'2026-03-25', notes:'Holding for Johnson kitchen project', is_active:true  },
  { hold_id:'HLD-002', product_id:products[3].id, customer_id:customers[1].id, hold_date:'2026-03-12', expiry_date:'2026-04-01', notes:'Azul Bahia for hotel lobby', is_active:true  },
  { hold_id:'HLD-003', product_id:products[2].id, customer_id:customers[2].id, hold_date:'2026-02-20', expiry_date:'2026-03-10', notes:'Expired — customer chose different material', is_active:false },
]).select();
console.log('✓ Holds:', holds?.length);

// SALES ORDERS
const { data: orders } = await s.from('sales_orders').insert([
  { order_number:'SO-2026-001', customer_id:customers[0].id, quote_id:quotes[0].id, status:'in_production', deposit_amount:2425 },
  { order_number:'SO-2026-002', customer_id:customers[1].id, quote_id:quotes[1].id, status:'confirmed',     deposit_amount:6100 },
  { order_number:'SO-2026-003', customer_id:customers[3].id, quote_id:quotes[3].id, status:'ready',         deposit_amount:14250 },
]).select();
console.log('✓ Sales Orders:', orders?.length);

// DELIVERIES
const { data: deliveries } = await s.from('deliveries').insert([
  { delivery_number:'DEL-2026-001', sales_order_id:orders[2].id, status:'ready',         scheduled_date:'2026-03-20', driver_name:'Marcus Thompson' },
  { delivery_number:'DEL-2026-002', sales_order_id:orders[0].id, status:'not_ready',     scheduled_date:'2026-03-28', driver_name:'Carlos Reyes' },
  { delivery_number:'DEL-2026-003', sales_order_id:orders[1].id, status:'out_for_delivery', scheduled_date:'2026-03-17', driver_name:'Marcus Thompson' },
]).select();
console.log('✓ Deliveries:', deliveries?.length);

// PURCHASE ORDERS
await s.from('purchase_orders').insert([
  { po_number:'PO-2026-001', supplier_name:'Granite Source Brazil', status:'confirmed', order_type:'bundle', expected_date:'2026-04-05', notes:'20 bundles Azul Bahia' },
  { po_number:'PO-2026-002', supplier_name:'Marble Imports Italy',  status:'sent',      order_type:'crate',  expected_date:'2026-04-15', notes:'Calacatta Gold — 4 crates' },
  { po_number:'PO-2026-003', supplier_name:'US Quartz Direct',      status:'draft',     order_type:'sqft',   expected_date:'2026-04-20', notes:'Cambria White 800 sqft' },
]);
console.log('✓ Purchase Orders seeded');

console.log('\n✅ All test data seeded successfully!');
