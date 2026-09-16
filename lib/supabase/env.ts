export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

// These values identify the CaseKit Supabase project and are intentionally safe
// to ship to browsers. Privileged service-role credentials must never live here.
const DEFAULT_SUPABASE_URL = "https://vplukseyrhgpbzitkwni.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oliRNXwMMYfMPjy4Ija-8w_ybIE2Gmu";

export function readSupabasePublicEnv(source: NodeJS.ProcessEnv = process.env): SupabasePublicEnv {
  const url = (source.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).trim();
  const publishableKey = (
    source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim();

  return { url, publishableKey };
}
