import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv } from "./env";

describe("readSupabasePublicEnv", () => {
  it("returns trimmed browser-safe values", () => {
    expect(
      readSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test ",
      } as NodeJS.ProcessEnv),
    ).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_test" });
  });

  it("rejects missing configuration", () => {
    expect(() => readSupabasePublicEnv({} as NodeJS.ProcessEnv)).toThrow(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });
});
