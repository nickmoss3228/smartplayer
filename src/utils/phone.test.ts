import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, isValidPhoneNumber, formatPhoneInput } from './phone';

// These cases are the contract with backend/src/config/phoneVerification.js.
// If that file's rules change, these fail — which is the point: a frontend
// that rejects what the backend accepts is invisible in every test that only
// exercises one side.
describe('normalizePhoneNumber', () => {
  it('accepts the separator-laden shape people actually type', () => {
    // The signup field's own placeholder. The old raw-regex check rejected it.
    expect(normalizePhoneNumber('+7 999 123-45-67')).toBe('+79991234567');
    expect(normalizePhoneNumber('8 (999) 123-45-67')).toBe('+79991234567');
    expect(normalizePhoneNumber('+7(999)123.45.67')).toBe('+79991234567');
  });

  it('folds all three country-code spellings onto one stored value', () => {
    expect(normalizePhoneNumber('89991234567')).toBe('+79991234567');
    expect(normalizePhoneNumber('79991234567')).toBe('+79991234567');
    expect(normalizePhoneNumber('+79991234567')).toBe('+79991234567');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePhoneNumber('  +79991234567  ')).toBe('+79991234567');
  });

  it('rejects anything that is not a 10-digit Russian number', () => {
    expect(normalizePhoneNumber('')).toBeNull();
    expect(normalizePhoneNumber('9991234567')).toBeNull(); // no country code
    expect(normalizePhoneNumber('+7999123456')).toBeNull(); // one digit short
    expect(normalizePhoneNumber('+799912345678')).toBeNull(); // one digit long
    expect(normalizePhoneNumber('+1 415 555 0100')).toBeNull(); // not Russia
    expect(normalizePhoneNumber('not a phone')).toBeNull();
  });

  it('is idempotent — normalizing an already-normal number changes nothing', () => {
    const once = normalizePhoneNumber('8 999 123 45 67')!;
    expect(normalizePhoneNumber(once)).toBe(once);
  });

  it('backs isValidPhoneNumber', () => {
    expect(isValidPhoneNumber('+7 999 123-45-67')).toBe(true);
    expect(isValidPhoneNumber('12345')).toBe(false);
  });
});

describe('formatPhoneInput', () => {
  it('builds the mask progressively as digits arrive', () => {
    expect(formatPhoneInput('+7 9')).toBe('+7 9');
    expect(formatPhoneInput('+7 999')).toBe('+7 999');
    expect(formatPhoneInput('+7 999123')).toBe('+7 999 123');
    expect(formatPhoneInput('+7 99912345')).toBe('+7 999 123-45');
    expect(formatPhoneInput('+79991234567')).toBe('+7 999 123-45-67');
  });

  it('treats a leading 8 as the same country code', () => {
    expect(formatPhoneInput('89991234567')).toBe('+7 999 123-45-67');
  });

  it('stops at 10 national digits instead of running off the end', () => {
    expect(formatPhoneInput('+799912345678999')).toBe('+7 999 123-45-67');
  });

  it('produces output its own normalizer accepts', () => {
    expect(normalizePhoneNumber(formatPhoneInput('89991234567'))).toBe('+79991234567');
  });

  it('leaves an empty field empty rather than pre-filling it', () => {
    // The user must be able to clear the input completely; forcing "+7 " back
    // in on every keystroke makes backspacing out of the field impossible.
    expect(formatPhoneInput('')).toBe('');
  });
});
