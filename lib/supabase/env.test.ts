import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv } from "./env";

describe("readSupabasePublicEnv", () => {
  it("allows explicit environment values to override defaults", () => {
    expect(
      readSupabasePublicEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test ",
      }),
    ).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_test" });
  });

  it("falls back to the browser-safe CaseKit project configuration", () => {
    const env = readSupabasePublicEnv({ NODE_ENV: "test" });
    expect(env.url).toBe("https://vplukseyrhgpbzitkwni.supabase.co");
    expect(env.publishableKey.startsWith("sb_publishable_")).toBe(true);
  });
});
