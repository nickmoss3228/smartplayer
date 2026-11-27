/**
 * The agreements a new account has to accept, in one place.
 *
 * Two documents, deliberately separate (152-ФЗ):
 *
 *   privacy  — Политика обработки персональных данных: the operator's published
 *              policy, which 152-ФЗ art. 18.1 requires to be freely readable.
 *   consent  — Согласие на обработку персональных данных: the user's own act.
 *              152-ФЗ treats consent as something given, specifically and
 *              knowingly — so it is its own tick box, never bundled into the
 *              privacy one.
 *
 * There is no user agreement / public offer (Оферта) while nothing is sold.
 * If paid access comes back, it needs one again, and a tick for it at signup.
 *
 * LEGAL_VERSION is stamped onto the account at signup and travels to the server
 * with the consent. Bump it whenever the wording of any document changes in a
 * way a user would need to re-agree to: what an account accepted then stays
 * answerable even after the site text has moved on.
 */
export const LEGAL_VERSION = '2026-11-27';

export type LegalDocId = 'privacy' | 'consent';

export const LEGAL_DOC_IDS: LegalDocId[] = ['privacy', 'consent'];

/** The document as a page on the site (linked from the landing footer). */
export const legalPath = (id: LegalDocId) => `/legal/${id}`;

/**
 * The same document as a PDF, opened in the browser's own viewer from the
 * signup ticks. The files live in public/pdf/ — replace them in place to
 * publish new wording (and bump LEGAL_VERSION).
 *
 * Not under /legal/: nginx sends every /legal/... path to the app shell, so a
 * PDF there would never be served as a file.
 */
export const legalPdfPath = (id: LegalDocId) => `/pdf/${id}.pdf`;
