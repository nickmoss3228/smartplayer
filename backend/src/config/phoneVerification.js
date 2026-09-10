export const PHONE_CODE_TTL_MS = 10 * 60 * 1000;
export const PHONE_TICKET_TTL_MS = 15 * 60 * 1000;
export const PHONE_RESEND_COOLDOWN_MS = 60 * 1000;
export const PHONE_MAX_ATTEMPTS = 5;

export function normalizePhoneNumber(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/[\s().-]/g, "");
  const normalized = raw.startsWith("8") && raw.length === 11
    ? `+7${raw.slice(1)}`
    : raw.startsWith("7") && raw.length === 11
      ? `+${raw}`
      : raw;
  return /^\+7\d{10}$/.test(normalized) ? normalized : null;
}

export function maskPhoneNumber(phone) {
  if (!phone) return "";
  return `${phone.slice(0, 2)} *** *** ${phone.slice(-2)}`;
}
