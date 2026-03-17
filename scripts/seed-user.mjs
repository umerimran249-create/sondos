import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }

const s = createClient(url, key);

const { data: { users } } = await s.auth.admin.listUsers();
const authUser = users[0];
console.log('Auth user:', authUser.email, authUser.id);

const { data: role } = await s.from('roles').select('id').eq('name','Admin').single();
console.log('Admin role id:', role.id);

const { data, error } = await s.from('users').upsert({
  auth_user_id: authUser.id,
  email: authUser.email,
  full_name: 'Admin',
  role_id: role.id
}, { onConflict: 'auth_user_id' }).select().single();

if (error) console.log('Error:', error.message);
else console.log('User profile linked:', data.email, '— Admin role assigned');
