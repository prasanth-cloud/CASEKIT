import { describe, expect, it } from "vitest";
import { classifyMissingInformation, validateExtraction, type ExtractedFactsCandidate } from "./extraction-schema";

const sources = [{ documentId: "doc-1", locator: "lines 1-12" }];
const base: ExtractedFactsCandidate = {
  merchant: "Example Store",
  orderId: "ORDER-1",
  orderDate: "2026-09-01",
  itemDescription: "Coffee maker",
  amountPaid: 89.5,
  deliveryDate: null,
  promisedDate: "2026-09-05",
  issueType: "missing_delivery",
  problemDescription: "The order did not arrive.",
  customerRequest: "Refund",
  claims: [
    { field: "merchant", value: "Example Store", confidence: 0.99, sources },
    { field: "order_id", value: "ORDER-1", confidence: 0.99, sources },
    { field: "order_date", value: "2026-09-01", confidence: 0.98, sources },
    { field: "item_description", value: "Coffee maker", confidence: 0.97, sources },
    { field: "amount_paid", value: 89.5, confidence: 0.99, sources },
    { field: "promised_date", value: "2026-09-05", confidence: 0.95, sources },
    { field: "issue_type", value: "missing_delivery", confidence: 0.94, sources },
    { field: "problem_description", value: "The order did not arrive.", confidence: 0.96, sources },
    { field: "customer_request", value: "Refund", confidence: 0.99, sources },
  ],
  missingInformation: [],
};

describe("extraction schema", () => {
  it("accepts supported facts only when every populated value is evidence-linked", () => {
    expect(validateExtraction(base)).toEqual(base);
  });

  it("rejects a populated fact omitted from the claims array", () => {
    expect(() =>
      validateExtraction({ ...base, claims: base.claims.filter((claim) => claim.field !== "merchant") }),
    ).toThrow(/merchant is missing evidence provenance/);
  });

  it("rejects factual claims without provenance", () => {
    expect(() =>
      validateExtraction({
        ...base,
        claims: base.claims.map((claim) =>
          claim.field === "merchant" ? { ...claim, sources: [] } : claim,
        ),
      }),
    ).toThrow(/Claim merchant is missing evidence provenance/);
  });

  it("rejects claim values that do not match the extracted field", () => {
    expect(() =>
      validateExtraction({
        ...base,
        claims: base.claims.map((claim) =>
          claim.field === "order_id" ? { ...claim, value: "OTHER" } : claim,
        ),
      }),
    ).toThrow(/order_id does not match/);
  });

  it("rejects confidence outside zero to one", () => {
    expect(() =>
      validateExtraction({
        ...base,
        claims: base.claims.map((claim) =>
          claim.field === "merchant" ? { ...claim, confidence: 1.2 } : claim,
        ),
      }),
    ).toThrow(/Invalid extracted claim/);
  });

  it("classifies required missing information deterministically", () => {
    const { missingInformation: _missing, ...candidate } = base;
    expect(
      classifyMissingInformation({
        ...candidate,
        merchant: null,
        issueType: null,
        problemDescription: null,
        customerRequest: null,
      }),
    ).toEqual(["merchant", "problem_description", "customer_request", "issue_type"]);
  });
});
