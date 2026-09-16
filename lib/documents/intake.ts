import { createHash, randomUUID } from "node:crypto";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const MIME_EXTENSION = new Map([
  ["application/pdf", [".pdf"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["text/plain", [".txt"]],
  ["message/rfc822", [".eml"]],
]);

export type ValidatedDocument = {
  name: string;
  mimeType: string;
  byteSize: number;
  hash: string;
  body: Blob;
};

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function safeStorageFilename(name: string) {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || "document";
}

export async function validateUploadedFile(file: File): Promise<ValidatedDocument> {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("Each document must be between 1 byte and 10 MB.");
  }

  const extensions = MIME_EXTENSION.get(file.type);
  if (!extensions || !extensions.includes(extensionOf(file.name))) {
    throw new Error("Allowed files are PDF, JPEG, PNG, TXT, and EML with matching file types.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    name: safeStorageFilename(file.name),
    mimeType: file.type,
    byteSize: file.size,
    hash: createHash("sha256").update(bytes).digest("hex"),
    body: new Blob([bytes], { type: file.type }),
  };
}

export async function validatePastedText(text: string): Promise<ValidatedDocument | null> {
  const normalized = text.trim();
  if (!normalized) return null;
  const bytes = new TextEncoder().encode(normalized);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Pasted text must be 10 MB or smaller.");
  }
  return {
    name: `pasted-${randomUUID()}.txt`,
    mimeType: "text/plain",
    byteSize: bytes.byteLength,
    hash: createHash("sha256").update(bytes).digest("hex"),
    body: new Blob([bytes], { type: "text/plain" }),
  };
}

export function retentionUntil(days: string) {
  if (!days) return null;
  const parsed = Number(days);
  if (![30, 90, 180].includes(parsed)) throw new Error("Invalid retention period.");
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + parsed);
  return date.toISOString();
}

export function storagePath(userId: string, caseId: string, filename: string) {
  return `${userId}/${caseId}/${randomUUID()}-${safeStorageFilename(filename)}`;
}
