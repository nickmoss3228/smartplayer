/**
 * The shortest password the sign-up, reset and change forms accept.
 *
 * Mirrors backend/src/config/password.js, which is what actually enforces it;
 * the forms only check first so the student gets the message without a round
 * trip. Keep the two equal, and keep the "8" in the locale strings in step.
 */
export const MIN_PASSWORD_LENGTH = 8;
