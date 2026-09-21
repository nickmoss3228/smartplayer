/**
 * The agreements a new account has to accept, in one place.
 *
 * Russian law wants three separate things, and they are deliberately three
 * documents rather than one wall of text:
 *
 *   terms    — Пользовательское соглашение: the contract for using the service.
 *   privacy  — Политика обработки персональных данных: the operator's published
 *              policy, which 152-ФЗ art. 18.1 requires to be freely readable.
 *   consent  — Согласие на обработку персональных данных: the user's own act.
 *              152-ФЗ treats consent as something given, specifically and
 *              knowingly — so it is its own tick box, never bundled into the
 *              terms one.
 *
 * LEGAL_VERSION is stamped onto the account at signup and travels to the server
 * with the consent. Bump it whenever the wording of any document changes in a
 * way a user would need to re-agree to: what an account accepted then stays
 * answerable even after the site text has moved on.
 */
export const LEGAL_VERSION = '2026-09-07';

export type LegalDocId = 'terms' | 'privacy' | 'consent';

export const LEGAL_DOC_IDS: LegalDocId[] = ['terms', 'privacy', 'consent'];

export const legalPath = (id: LegalDocId) => `/legal/${id}`;
