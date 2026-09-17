import { NextResponse } from "next/server";
import { ownedStoragePath, retentionExpired, type DeletionReason } from "@/lib/documents/deletion";
import { createClient } from "@/lib/supabase/server";

type DeletionRpcClient = {
  rpc: (
    name: "finalize_document_deletion",
    args: { p_case_id: string; p_document_id: string; p_expected_storage_path: string; p_reason: DeletionReason },
  ) => PromiseLike<{ error: { message: string } | null }>;
};

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
  if (reason === "retention_expired" && !retentionExpired(document.retention_until)) {
    return redirectToCase(request, caseId, "error", "This document has not reached its retention date.");
  }

  let storagePath: string;
  try {
    storagePath = ownedStoragePath(auth.user.id, caseId, document.storage_path);
  } catch {
    return redirectToCase(request, caseId, "error", "Document ownership validation failed.");
  }

  // Always retry the private Storage removal, even when metadata already says deleted.
  // This makes retries repair a rare prior partial failure without exposing the path.
  const { error: storageError } = await supabase.storage.from("case-documents").remove([storagePath]);
  if (storageError) return redirectToCase(request, caseId, "error", "Document storage could not be deleted.");

  const rpc = supabase as unknown as DeletionRpcClient;
  const { error: finalizeError } = await rpc.rpc("finalize_document_deletion", {
    p_case_id: caseId,
    p_document_id: documentId,
    p_expected_storage_path: storagePath,
    p_reason: reason,
  });

  if (finalizeError) {
    return redirectToCase(request, caseId, "error", "Document storage was removed, but metadata finalization needs a retry.");
  }

  return redirectToCase(request, caseId, "documentDeleted");
}
