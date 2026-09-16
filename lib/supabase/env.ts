export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export function readSupabasePublicEnv(source: NodeJS.ProcessEnv = process.env): SupabasePublicEnv {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Configure CaseKit's public Supabase environment before using authentication.",
    );
  }

  return { url, publishableKey };
}
