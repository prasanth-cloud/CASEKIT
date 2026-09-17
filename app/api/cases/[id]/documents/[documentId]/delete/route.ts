import { NextResponse } from "next/server";
import { deletionAlreadyComplete, deletionAuditChanges, ownedStoragePath, retentionExpired, type DeletionReason } from "@/lib/documents/deletion";
import { createClient } from "@/lib/supabase/server";

function redirectToCase(request: Request, caseId: string, key: string, value = "1") {
  const url = new URL(`/cases/${caseId}`, request.url);
  url.searchParams.set("tab", "documents");
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id: caseId, documentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/cases/${caseId}?tab=documents`);
    return NextResponse.redirect(login, 303);
  }

  const formData = await request.formData();
  const requestedReason = String(formData.get("reason") ?? "user_request");
  const reason: DeletionReason = requestedReason === "retention_expired" ? "retention_expired" : "user_request";

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id,case_id,user_id,storage_path,status,deleted_at,retention_until")
    .eq("id", documentId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (documentError || !document) return redirectToCase(request, caseId, "error", "Document not found or no longer accessible.");
  if (deletionAlreadyComplete(document)) return redirectToCase(request, caseId, "documentDeleted");
  if (reason === "retention_expired" && !retentionExpired(document.retention_until)) {
    return redirectToCase(request, caseId, "error", "This document has not reached its retention date.");
  }

  let storagePath: string;
  try {
    storagePath = ownedStoragePath(auth.user.id, caseId, document.storage_path);
  } catch {
    return redirectToCase(request, caseId, "error", "Document ownership validation failed.");
  }

  // Delete the private object first. If a later metadata write fails, retrying this
  // endpoint is safe: removing the same private path again is an idempotent repair step.
  const { error: storageError } = await supabase.storage.from("case-documents").remove([storagePath]);
  if (storageError) return redirectToCase(request, caseId, "error", "Document storage could not be deleted.");

  const deletedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("documents")
    .update({ status: "deleted", deleted_at: deletedAt })
    .eq("id", documentId)
    .eq("case_id", caseId)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) return redirectToCase(request, caseId, "error", "Document metadata deletion could not be finalized. Retry the deletion.");

  const { error: auditError } = await supabase.from("audit_events").insert({
    user_id: auth.user.id,
    case_id: caseId,
    actor_type: "user",
    action: "document.deleted",
    changes: deletionAuditChanges(documentId, reason),
    supporting_document_ids: [],
  });

  if (auditError) return redirectToCase(request, caseId, "error", "Document was deleted, but its audit record could not be finalized.");
  return redirectToCase(request, caseId, "documentDeleted");
}
