// services/payments/errors.js
//
// The two failures a driver reports from parseCallback, in their own module so
// that drivers can import them without importing the registry that imports the
// drivers. The cycle would probably have worked — ESM bindings are live, and
// nothing here is touched at module scope — but "probably" is a poor foundation
// for the code path that decides whether someone gets what they paid for.

/** Authentication failed: a forgery, or a token that no longer verifies. -> 403 */
export class CallbackRejected extends Error {
  constructor(message = "Callback rejected") {
    super(message);
    this.name = "CallbackRejected";
  }
}

/** Not a payload we recognise at all — malformed, truncated, wrong shape. -> 400 */
export class CallbackUnparseable extends Error {
  constructor(message = "Callback unparseable") {
    super(message);
    this.name = "CallbackUnparseable";
  }
}
