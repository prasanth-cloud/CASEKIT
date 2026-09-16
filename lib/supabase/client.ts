"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { readSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, publishableKey } = readSupabasePublicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
