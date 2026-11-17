// config/password.js
//
// The shortest password a new account, a reset or a change may set. Raised from
// 6 to 8 on 2026-11-17 (NIST SP 800-63B's floor for user-chosen secrets).
// Existing shorter passwords keep working: login never checks the length, so
// nobody is locked out; the rule applies the next time a password is chosen.
//
// Mirrored by the frontend forms (src/auth/passwordRules.ts). Keep the two equal.
export const MIN_PASSWORD_LENGTH = 8;
