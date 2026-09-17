export type DeletableDocument = {
  id: string;
  case_id: string;
  user_id: string;
  storage_path: string;
  status: string;
  deleted_at: string | null;
  retention_until: string | null;
};

export type DeletionReason = "user_request" | "retention_expired";

export function ownedStoragePath(userId: string, caseId: string, storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const prefix = `${userId}/${caseId}/`;
  if (!userId || !caseId || !normalized.startsWith(prefix) || normalized.length <= prefix.length) {
    throw new Error("Document storage path does not belong to this user and case.");
  }
  return normalized;
}

export function retentionExpired(retentionUntil: string | null, now = new Date()) {
  if (!retentionUntil) return false;
  const expiresAt = new Date(retentionUntil);
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime();
}

export function deletionAlreadyComplete(document: Pick<DeletableDocument, "status" | "deleted_at">) {
  return document.status === "deleted" && Boolean(document.deleted_at);
}

export function deletionAuditChanges(documentId: string, reason: DeletionReason) {
  if (!documentId.trim()) throw new Error("Document ID is required.");
  return { document_id: documentId, reason, storage_removed: true } as const;
}
