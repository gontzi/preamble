import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Forzamos el uso de la Service Role Key. Si no existe, mejor que falle a que use la Anon por error.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    throw new Error("Falta la SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false, // CRUCIAL para uso en servidor
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});