export type MerchantSourceKind = "policy" | "contact";

export type MerchantSource = {
  id: string;
  merchantKey: string;
  kind: MerchantSourceKind;
  title: string;
  url: string;
  retrievedAt: string;
  approved: boolean;
};

export type MerchantSourceRegistry = ReadonlyArray<MerchantSource>;

export function approvedSourcesForMerchant(registry: MerchantSourceRegistry, merchantKey: string) {
  const key = merchantKey.trim().toLowerCase();
  return registry.filter((source) => source.approved && source.merchantKey.trim().toLowerCase() === key);
}

export function approvedSourceById(registry: MerchantSourceRegistry, sourceId: string) {
  return registry.find((source) => source.approved && source.id === sourceId) ?? null;
}

export function validateMerchantSource(source: MerchantSource) {
  if (!source.id.trim() || !source.merchantKey.trim() || !source.title.trim()) {
    throw new Error("Merchant source metadata is incomplete.");
  }

  let parsed: URL;
  try {
    parsed = new URL(source.url);
  } catch {
    throw new Error("Merchant source URL is invalid.");
  }

  if (parsed.protocol !== "https:") throw new Error("Merchant sources must use HTTPS.");
  if (!Number.isFinite(Date.parse(source.retrievedAt))) throw new Error("Merchant source retrieval time is invalid.");

  return source;
}
