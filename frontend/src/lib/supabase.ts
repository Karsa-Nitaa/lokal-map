import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
      "Create a .env.local file from .env.example and add your project credentials."
  );
}

// The anon key is safe to expose in the browser — security is enforced by
// Row Level Security (RLS) policies on the Supabase side.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
