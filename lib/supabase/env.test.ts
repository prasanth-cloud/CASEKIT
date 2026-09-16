import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv } from "./env";

describe("readSupabasePublicEnv", () => {
  it("returns trimmed browser-safe values", () => {
    expect(
      readSupabasePublicEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test ",
      }),
    ).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_test" });
  });

  it("rejects missing configuration", () => {
    expect(() => readSupabasePublicEnv({ NODE_ENV: "test" })).toThrow(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });
});
