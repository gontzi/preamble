import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Note: For server-side operations (actions), prefer using SUPABASE_SERVICE_ROLE_KEY if available
// for bypassing RLS if needed, or stick to ANON key and RLS policies.
// Here we init a simple client.
export const supabase = createClient(supabaseUrl, supabaseKey);
