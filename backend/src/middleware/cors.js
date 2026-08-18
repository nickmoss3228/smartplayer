// middleware/cors.js
export const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    // малако.рф, in punycode. A browser sends the A-label form in the Origin
    // header even though the user sees Cyrillic in the address bar, so the
    // literal 'https://малако.рф' would never match anything.
    //   малако.рф -> xn--80aa4acdq.xn--p1ai
    'https://xn--80aa4acdq.xn--p1ai',
    'https://www.xn--80aa4acdq.xn--p1ai',
    // Staging, on the same VM. Served same-origin through its own nginx like
    // production, so this entry is belt-and-braces rather than load-bearing —
    // it only matters if something is ever pointed at the staging API with an
    // absolute origin (a local bundle built against it, say).
    'https://test.xn--80aa4acdq.xn--p1ai',
    // Legacy domain, still live on Vercel until DNS is cut over.
    'https://infinityplayer.xyz',
    'https://www.infinityplayer.xyz',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
    // No trailing slash: a browser Origin header is never slash-terminated,
    // so 'http://89.169.159.92/' could never match and was dead config.
    'http://89.169.159.92',
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // The ACAO header above depends on the request's Origin, so any shared cache
  // in front of us must key on it — otherwise one origin's response could be
  // served to another.
  res.setHeader('Vary', 'Origin');

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Cross-origin JS cannot read a response header unless it is explicitly
  // exposed. Without this the rate limiter's 429 arrives with Retry-After and
  // RateLimit-* stripped, so the login form can't tell the user how long to
  // wait. Only matters in local dev (:5173 -> :3000) — production is
  // same-origin through nginx, where this is a harmless no-op.
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Retry-After, RateLimit, RateLimit-Policy'
  );

  // Preflights short-circuit here, BEFORE the rate limiter mounted in app.js —
  // deliberate, so an empty-bodied OPTIONS never burns a user's quota.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '600'); // cache preflights 10 min
    return res.status(200).end();
  }

  next();
};