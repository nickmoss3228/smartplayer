/**
 * Russian phone normalization, mirroring backend/src/config/phoneVerification.js.
 *
 * The two must agree, because the frontend decides whether to even send the
 * request. They previously did not: SignUp.tsx tested the raw input against
 * /^(\+7|8)\d{10}$/, so "+7 999 123-45-67" — the exact shape of the field's
 * own placeholder, and of every number written down anywhere in Russia — was
 * rejected in the browser even though the backend strips separators and would
 * have accepted it.
 *
 * Normalize first, then validate the result. Never validate raw input.
 */
export function normalizePhoneNumber(value: string): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/[\s().-]/g, '');
  const normalized =
    raw.startsWith('8') && raw.length === 11
      ? `+7${raw.slice(1)}`
      : raw.startsWith('7') && raw.length === 11
        ? `+${raw}`
        : raw;
  return /^\+7\d{10}$/.test(normalized) ? normalized : null;
}

/** True when the input names a Russian mobile number in any accepted shape. */
export function isValidPhoneNumber(value: string): boolean {
  return normalizePhoneNumber(value) !== null;
}

/**
 * Progressive display formatting: +7 999 123-45-67.
 *
 * Applied as the user types so the field reads like a phone number rather than
 * a digit soup, and so the shape of what is expected is visible before they
 * finish. Anything that doesn't look like it is on its way to a +7 number is
 * handed back untouched — a half-typed international number must stay editable.
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  // Both "8XXX…" (domestic) and "7XXX…" (international) mean the same country
  // code, and users type both. Fold them together and keep the 10 that matter.
  const national = (digits.startsWith('8') || digits.startsWith('7') ? digits.slice(1) : digits).slice(0, 10);

  const parts = [
    national.slice(0, 3),
    national.slice(3, 6),
    national.slice(6, 8),
    national.slice(8, 10),
  ].filter(Boolean);

  if (parts.length === 0) return '+7 ';
  return `+7 ${parts[0]}${parts[1] ? ` ${parts[1]}` : ''}${parts[2] ? `-${parts[2]}` : ''}${parts[3] ? `-${parts[3]}` : ''}`;
}
