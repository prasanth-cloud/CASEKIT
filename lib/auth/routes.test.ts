import { describe, expect, it } from "vitest";
import { isPublicPath } from "./routes";

describe("isPublicPath", () => {
  it("allows the public showcase and auth callback routes", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/demo")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/observability")).toBe(true);
  });

  it("keeps workspace routes protected", () => {
    expect(isPublicPath("/home")).toBe(false);
    expect(isPublicPath("/cases")).toBe(false);
    expect(isPublicPath("/documents")).toBe(false);
    expect(isPublicPath("/api/cases")).toBe(false);
  });
});
