const SUPABASE_URL = 'https://bzjxwrcefctxzxhmxtcd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_f6hfMTA-VAJnHP7PV9mkCg_KxdtsawR';

if (!window.supabase || !window.supabase.createClient) {
  throw new Error('Supabase client não foi carregado.');
}

window.despachanteSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
