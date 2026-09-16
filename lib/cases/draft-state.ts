import type { DraftRow } from "@/lib/database.types";

type SafetyResult = { passed: boolean; reasons: string[] };

function safetyResult(value: DraftRow["safety_result"]): SafetyResult | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const passed = value.passed;
  const reasons = value.reasons;
  if (typeof passed !== "boolean" || !Array.isArray(reasons) || !reasons.every((reason) => typeof reason === "string")) return null;
  return { passed, reasons };
}

export function canApprovePersistedDraft(draft: DraftRow, currentFactsVersion: number, latestDraftVersion: number) {
  const safety = safetyResult(draft.safety_result);
  return Boolean(
    draft.version === latestDraftVersion &&
      draft.facts_version === currentFactsVersion &&
      (draft.status === "generated" || draft.status === "edited") &&
      draft.sent_at === null &&
      draft.approved_at === null &&
      safety?.passed === true &&
      safety.reasons.length === 0,
  );
}
