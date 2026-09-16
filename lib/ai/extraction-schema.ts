import type { CaseIssueType } from "@/lib/database.types";

export type EvidenceSourceRef = {
  documentId: string;
  locator: string;
  quote?: string;
};

export type ExtractedClaim = {
  field: string;
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

export function validateExtraction(candidate: ExtractedFactsCandidate) {
  if (candidate.issueType && !issueTypes.has(candidate.issueType)) throw new Error("Unsupported issue type.");
  for (const claim of candidate.claims) {
    if (!claim.field || claim.confidence < 0 || claim.confidence > 1) throw new Error("Invalid extracted claim.");
    if (claim.value !== null && claim.sources.length === 0) throw new Error(`Claim ${claim.field} is missing evidence provenance.`);
    for (const source of claim.sources) {
      if (!source.documentId || !source.locator) throw new Error(`Claim ${claim.field} has an incomplete source reference.`);
    }
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
