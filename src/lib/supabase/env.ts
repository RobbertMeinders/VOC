function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Ontbrekende environment variable "${name}". Kopieer .env.local.example naar .env.local en vul de Supabase-gegevens in.`
    );
  }
  return value;
}

export const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
