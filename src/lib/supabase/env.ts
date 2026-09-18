// Next.js inlines NEXT_PUBLIC_* variables into the browser bundle by
// statically finding the literal `process.env.NEXT_PUBLIC_X` text at build
// time — it cannot do this for dynamic/bracket access like
// `process.env[name]`. So each call site below must spell out the literal
// property access; requireEnv() only handles the "missing" error, it never
// touches process.env itself.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ontbrekende environment variable "${name}". Kopieer .env.local.example naar .env.local en vul de Supabase-gegevens in.`
    );
  }
  return value;
}

export const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
