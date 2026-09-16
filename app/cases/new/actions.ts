"use server";

import { redirect } from "next/navigation";
import type { CaseIssueType } from "@/lib/database.types";
import {
  retentionUntil,
  storagePath,
  validatePastedText,
  validateUploadedFile,
  type ValidatedDocument,
} from "@/lib/documents/intake";
import { createClient } from "@/lib/supabase/server";

const ISSUE_TYPES = new Set<CaseIssueType>([
  "missing_delivery",
  "damaged_item",
  "refund_not_received",
  "duplicate_charge",
  "return_rejected",
  "cancelled_order",
  "poor_service",
]);

function fail(message: string): never {
  redirect(`/cases/new?error=${encodeURIComponent(message)}`);
}

export async function createCaseWithEvidence(formData: FormData) {
  const merchantName = String(formData.get("merchantName") ?? "").trim();
  const issueType = String(formData.get("issueType") ?? "") as CaseIssueType;
  const desiredResolution = String(formData.get("desiredResolution") ?? "").trim();
  const pastedText = String(formData.get("pastedText") ?? "");
  const retention = String(formData.get("retentionDays") ?? "");
  const files = formData.getAll("documents").filter((value): value is File => value instanceof File && value.size > 0);

  if (!merchantName) fail("Merchant name is required.");
  if (!ISSUE_TYPES.has(issueType)) fail("Choose a valid issue type.");

  let validated: ValidatedDocument[];
  let retentionDate: string | null;
  try {
    validated = await Promise.all(files.map(validateUploadedFile));
    const pasted = await validatePastedText(pastedText);
    if (pasted) validated.push(pasted);
    retentionDate = retentionUntil(retention);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Document validation failed.");
  }

  if (validated.length === 0) fail("Add at least one document or paste supporting text.");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login?next=/cases/new");

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .insert({
      user_id: auth.user.id,
      merchant_name: merchantName,
      issue_type: issueType,
      desired_resolution: desiredResolution || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (caseError || !caseRow) fail("Could not create the case. Please try again.");

  const uploadedPaths: string[] = [];
  try {
    for (const document of validated) {
      const path = storagePath(auth.user.id, caseRow.id, document.name);
      const { error: uploadError } = await supabase.storage
        .from("case-documents")
        .upload(path, document.body, { contentType: document.mimeType, upsert: false });
      if (uploadError) throw new Error(`Upload failed for ${document.name}.`);
      uploadedPaths.push(path);

      const { error: metadataError } = await supabase.from("documents").insert({
        case_id: caseRow.id,
        user_id: auth.user.id,
        storage_path: path,
        file_type: document.mimeType,
        file_hash: document.hash,
        byte_size: document.byteSize,
        retention_until: retentionDate,
        status: "uploaded",
        redaction_status: document.mimeType === "text/plain" ? "not_required" : "pending",
      });
      if (metadataError) throw new Error(`Could not record metadata for ${document.name}.`);
    }
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from("case-documents").remove(uploadedPaths);
    await supabase.from("cases").delete().eq("id", caseRow.id);
    fail(error instanceof Error ? error.message : "Secure intake failed. No partial case was retained.");
  }

  redirect(`/cases?created=${caseRow.id}`);
}
