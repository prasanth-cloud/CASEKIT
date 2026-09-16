import { describe, expect, it } from "vitest";
import { classifyMissingInformation, validateExtraction, type ExtractedFactsCandidate } from "./extraction-schema";

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
    {
      field: "order_id",
      value: "ORDER-1",
      confidence: 0.99,
      sources: [{ documentId: "doc-1", locator: "lines 2-3" }],
    },
  ],
  missingInformation: [],
};

describe("extraction schema", () => {
  it("accepts supported, evidence-linked claims", () => {
    expect(validateExtraction(base)).toEqual(base);
  });

  it("rejects factual claims without provenance", () => {
    expect(() =>
      validateExtraction({
        ...base,
        claims: [{ field: "merchant", value: "Example Store", confidence: 0.9, sources: [] }],
      }),
    ).toThrow(/missing evidence provenance/);
  });

  it("rejects confidence outside zero to one", () => {
    expect(() =>
      validateExtraction({
        ...base,
        claims: [{ field: "merchant", value: "Example Store", confidence: 1.2, sources: [{ documentId: "doc-1", locator: "header" }] }],
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
