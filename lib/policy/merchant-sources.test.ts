import { describe, expect, it } from "vitest";
import { approvedSourceById, approvedSourcesForMerchant, validateMerchantSource } from "./merchant-sources";

const registry = [
  {
    id: "source-1",
    merchantKey: "example-store",
    kind: "policy" as const,
    title: "Returns policy",
    url: "https://example.com/returns",
    retrievedAt: "2026-09-16T20:00:00Z",
    approved: true,
  },
  {
    id: "source-2",
    merchantKey: "example-store",
    kind: "contact" as const,
    title: "Unreviewed contact page",
    url: "https://example.com/contact",
    retrievedAt: "2026-09-16T20:00:00Z",
    approved: false,
  },
];

describe("merchant source registry", () => {
  it("returns only approved sources for the requested merchant", () => {
    expect(approvedSourcesForMerchant(registry, " Example-Store ").map((source) => source.id)).toEqual(["source-1"]);
  });

  it("never resolves an unapproved source by id", () => {
    expect(approvedSourceById(registry, "source-2")).toBeNull();
  });

  it("requires HTTPS and complete metadata", () => {
    expect(() => validateMerchantSource({ ...registry[0], url: "http://example.com/returns" })).toThrow("HTTPS");
    expect(validateMerchantSource(registry[0])).toEqual(registry[0]);
  });
});
