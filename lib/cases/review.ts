import type { CaseIssueType, ExtractedFactsRow } from "@/lib/database.types";

export const caseIssueTypes: CaseIssueType[] = [
  "missing_delivery",
  "damaged_item",
  "refund_not_received",
  "duplicate_charge",
  "return_rejected",
  "cancelled_order",
  "poor_service",
];

export function isReadyForDrafting(facts: ExtractedFactsRow | null) {
  return Boolean(
    facts?.merchant?.trim() &&
      facts.issue_type &&
      facts.problem_description?.trim() &&
      facts.customer_request?.trim(),
  );
}

export function factProvenance(facts: Pick<ExtractedFactsRow, "extracted_by" | "source_document_ids">) {
  if (facts.extracted_by === "user") {
    return { kind: "user_review" as const, documentIds: [] as string[] };
  }

  return { kind: "evidence" as const, documentIds: facts.source_document_ids };
}

export function humanize(value: string | null | undefined) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
