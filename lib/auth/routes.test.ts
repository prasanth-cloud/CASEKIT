import { describe, expect, it } from "vitest";
import { isPublicPath } from "./routes";

describe("isPublicPath", () => {
  it("allows login and auth callback routes", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it("keeps workspace routes protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/cases")).toBe(false);
    expect(isPublicPath("/documents")).toBe(false);
  });
});
