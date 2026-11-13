import { createClient } from '@supabase/supabase-js';

// Se aceptan ambos nombres de variables para no romper si el .env usa uno u otro.
// `EXPO_PUBLIC_SUPABASE_API_URL` puede venir con `/rest/v1/` al final: supabase-js
// añade esa ruta por su cuenta, así que se recorta para evitar URLs inválidas.
const urlCruda =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_API_URL;

const supabaseUrl = urlCruda
  ?.trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '');

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_API_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_KEY en el archivo .env.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
