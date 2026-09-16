const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeRecipientEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !emailPattern.test(email)) {
    throw new Error("Enter a valid destination email address.");
  }
  return email;
}

export function requireIdempotencyKey(value: string) {
  const key = value.trim();
  if (!key || key.length > 128) throw new Error("The retry key is invalid. Reload and try again.");
  return key;
}

export function parseReminderDate(value: string, now = new Date()) {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a reminder date.");

  const dueAt = new Date(`${date}T09:00:00.000Z`);
  const [year, month, day] = date.split("-").map(Number);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getUTCFullYear() !== year || dueAt.getUTCMonth() + 1 !== month || dueAt.getUTCDate() !== day || dueAt <= now) {
    throw new Error("Choose a future reminder date.");
  }

  const latestAllowed = new Date(now);
  latestAllowed.setUTCFullYear(latestAllowed.getUTCFullYear() + 1);
  if (dueAt > latestAllowed) throw new Error("Choose a reminder date within the next year.");

  return dueAt.toISOString();
}

export function validateOutboundAuthorization(input: {
  recipientEmail: string;
  draftVersion: number;
  destinationConfirmed: boolean;
  attachmentsConfirmed: boolean;
  sendAuthorized: boolean;
  idempotencyKey: string;
}) {
  if (!Number.isInteger(input.draftVersion) || input.draftVersion < 1) throw new Error("The draft version is invalid. Reload before continuing.");
  if (!input.destinationConfirmed) throw new Error("Confirm the destination before recording authorization.");
  if (!input.attachmentsConfirmed) throw new Error("Confirm the attachment list before recording authorization.");
  if (!input.sendAuthorized) throw new Error("Confirm the separate send authorization boundary before continuing.");

  return {
    recipientEmail: normalizeRecipientEmail(input.recipientEmail),
    idempotencyKey: requireIdempotencyKey(input.idempotencyKey),
  };
}
