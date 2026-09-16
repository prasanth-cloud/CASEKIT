import type { CaseIssueType } from "@/lib/database.types";

export type EvidenceSourceRef = {
  documentId: string;
  locator: string;
  quote?: string;
};

export type ExtractedFactField =
  | "merchant"
  | "order_id"
  | "order_date"
  | "item_description"
  | "amount_paid"
  | "delivery_date"
  | "promised_date"
  | "issue_type"
  | "problem_description"
  | "customer_request";

export type ExtractedClaim = {
  field: ExtractedFactField;
  value: string | number | null;
  confidence: number;
  sources: EvidenceSourceRef[];
};

export type ExtractedFactsCandidate = {
  merchant: string | null;
  orderId: string | null;
  orderDate: string | null;
  itemDescription: string | null;
  amountPaid: number | null;
  deliveryDate: string | null;
  promisedDate: string | null;
  issueType: CaseIssueType | null;
  problemDescription: string | null;
  customerRequest: string | null;
  claims: ExtractedClaim[];
  missingInformation: string[];
};

const issueTypes = new Set<CaseIssueType>([
  "missing_delivery",
  "damaged_item",
  "refund_not_received",
  "duplicate_charge",
  "return_rejected",
  "cancelled_order",
  "poor_service",
]);

const factualFields: ReadonlyArray<{
  claimField: ExtractedFactField;
  value: (candidate: ExtractedFactsCandidate) => string | number | null;
}> = [
  { claimField: "merchant", value: (candidate) => candidate.merchant },
  { claimField: "order_id", value: (candidate) => candidate.orderId },
  { claimField: "order_date", value: (candidate) => candidate.orderDate },
  { claimField: "item_description", value: (candidate) => candidate.itemDescription },
  { claimField: "amount_paid", value: (candidate) => candidate.amountPaid },
  { claimField: "delivery_date", value: (candidate) => candidate.deliveryDate },
  { claimField: "promised_date", value: (candidate) => candidate.promisedDate },
  { claimField: "issue_type", value: (candidate) => candidate.issueType },
  { claimField: "problem_description", value: (candidate) => candidate.problemDescription },
  { claimField: "customer_request", value: (candidate) => candidate.customerRequest },
];

export function validateExtraction(candidate: ExtractedFactsCandidate) {
  if (candidate.issueType && !issueTypes.has(candidate.issueType)) throw new Error("Unsupported issue type.");

  const claimsByField = new Map<ExtractedFactField, ExtractedClaim>();
  for (const claim of candidate.claims) {
    if (claim.confidence < 0 || claim.confidence > 1) throw new Error("Invalid extracted claim.");
    if (claimsByField.has(claim.field)) throw new Error(`Duplicate claim coverage for ${claim.field}.`);
    if (claim.value !== null && claim.sources.length === 0) throw new Error(`Claim ${claim.field} is missing evidence provenance.`);
    for (const source of claim.sources) {
      if (!source.documentId || !source.locator) throw new Error(`Claim ${claim.field} has an incomplete source reference.`);
    }
    claimsByField.set(claim.field, claim);
  }

  for (const field of factualFields) {
    const value = field.value(candidate);
    const claim = claimsByField.get(field.claimField);
    if (value === null) {
      if (claim && claim.value !== null) throw new Error(`Claim ${field.claimField} conflicts with an empty extracted fact.`);
      continue;
    }
    if (!claim) throw new Error(`Extracted fact ${field.claimField} is missing evidence provenance.`);
    if (claim.value !== value) throw new Error(`Claim ${field.claimField} does not match its extracted fact.`);
    if (claim.sources.length === 0) throw new Error(`Claim ${field.claimField} is missing evidence provenance.`);
  }

  return candidate;
}

export function classifyMissingInformation(candidate: Omit<ExtractedFactsCandidate, "missingInformation">) {
  const missing: string[] = [];
  if (!candidate.merchant) missing.push("merchant");
  if (!candidate.problemDescription) missing.push("problem_description");
  if (!candidate.customerRequest) missing.push("customer_request");
  if (!candidate.issueType) missing.push("issue_type");
  return missing;
}
