import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);