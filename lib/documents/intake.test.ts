import { describe, expect, it } from "vitest";
import {
  MAX_DOCUMENT_BYTES,
  retentionUntil,
  safeStorageFilename,
  storagePath,
  validatePastedText,
  validateUploadedFile,
} from "./intake";

describe("document intake", () => {
  it("accepts a matching supported file and hashes it", async () => {
    const file = new File(["receipt"], "receipt.txt", { type: "text/plain" });
    const validated = await validateUploadedFile(file);
    expect(validated.mimeType).toBe("text/plain");
    expect(validated.byteSize).toBe(7);
    expect(validated.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects mismatched or oversized files", async () => {
    await expect(validateUploadedFile(new File(["x"], "receipt.pdf", { type: "text/plain" }))).rejects.toThrow(/Allowed files/);
    const oversized = new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], "large.txt", { type: "text/plain" });
    await expect(validateUploadedFile(oversized)).rejects.toThrow(/10 MB/);
  });

  it("normalizes filenames and creates ownership-scoped paths", () => {
    expect(safeStorageFilename(" order #123 ?.pdf ")).toBe("order-123-.pdf");
    const path = storagePath("user-1", "case-1", "proof.pdf");
    expect(path.startsWith("user-1/case-1/")).toBe(true);
    expect(path.endsWith("-proof.pdf")).toBe(true);
  });

  it("turns pasted text into a text document and supports explicit retention", async () => {
    const pasted = await validatePastedText(" order confirmation ");
    expect(pasted?.mimeType).toBe("text/plain");
    expect(pasted?.byteSize).toBeGreaterThan(0);
    expect(retentionUntil("30")).toMatch(/T/);
    expect(retentionUntil("")).toBeNull();
    expect(() => retentionUntil("45")).toThrow(/Invalid retention/);
  });
});
