// helpers/asyncHandler.js
// Express 4 does not catch rejections from async route handlers. An `await`
// that throws inside one is an unhandled rejection: the response is never
// sent, the error middleware in app.js never fires, and the request hangs
// until the client gives up. Wrapping forwards the rejection to next() so it
// lands in the error handler as a normal 500.
//
// Most controllers here wrap their own bodies in try/catch. The four in
// admin.controller.js do not — those are the ones that need this.

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
