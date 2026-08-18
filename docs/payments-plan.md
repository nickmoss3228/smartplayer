# Taking money: a plan on deck

Status: **not decided, nothing built.** This exists so the decision can be made
quickly later, not because it has been made.

Written 2026-08-17 against the codebase as it stands.

---

## 1. Where the app actually is today

Worth being precise, because it changes what "adding payments" means.

- **There is no paywall.** `FREE_TRIAL_STORIES = 2` gates *guests* from
  *registered users* — tracks 1–2 are open, then you must sign up. After signup
  everything is free. So the work is not "add a payment step to an existing
  paywall", it is "introduce the concept of paid access at all".
- **The spend side already exists and is done properly.**
  `helpers/spendCurrency.js` decrements the wallet inside a single
  `findOneAndUpdate` filter, so two rapid purchases cannot both read a stale
  balance. `shopCatalog.js` / `characterCatalog.js` price everything
  server-side; the client never sends a price. That is exactly the discipline
  real payments need, and it is already the house style.
- **`src/config/*` mirrors `backend/src/config/*` by hand.** Three of those
  pairs are covered by `src/config/catalogMirror.test.ts`. A price catalog must
  join that test on day one — see §6.
- **`FREE_TRIAL_STORIES` is itself an unguarded hand-kept mirror**
  (`backend/src/config/trial.js` ↔ `src/constants/trial.ts`, with a comment
  saying so). If trial length becomes commercially meaningful, add it to the
  mirror test.

---

## 2. What to sell — four options

### A. Subscription for full access
Monthly/yearly, everything unlocked while active.

- **For:** predictable revenue, the default for language apps, best economics if
  content keeps growing (the Story Builder means it can).
- **Against:** the heaviest option by far. Recurring charges need separate
  user consent, a cancellation flow, dunning for failed renewals, proration,
  and a fiscal receipt *per charge*, not per purchase. Subscriptions for a
  finite library also read badly until the library is visibly growing.

### B. One-time unlock of a level or story
"Open Medium", or "open Daniel's story", bought once, kept forever.

- **For:** smallest legal and technical surface — no recurring billing, no
  dunning, one receipt per purchase. Maps directly onto structures that already
  exist (`difficulty` → story `slug` → parts). Matches finite content honestly.
- **Against:** no recurring revenue; revenue caps out at the size of the library.

### C. Sell BitAward (top up the soft currency)
Real money buys BitAward; BitAward buys what it already buys.

- **For:** architecturally almost free. The wallet, the atomic spend, the
  catalogs, the shop UI all exist. The only new server behaviour is "credit the
  wallet when a payment confirms". Learning content stays free, which is a
  defensible position for an education product.
- **Against:** cosmetics-only revenue in a small app is thin. More importantly
  it puts purchased and earned currency in one balance, which quietly devalues
  the earning loop the whole quiz/repeat design is built around.

### D. Free content, paid tools
Content stays free; charge for Story Builder access, a teacher/class dashboard,
offline download.

- **For:** sells to teachers and schools, who have budgets, rather than to
  learners who mostly do not. Story Builder already exists.
- **Against:** a different product and a different buyer. Real work beyond
  payments.

### Recommendation

**Start with B, built so A can be added without redoing anything.**

The reasoning: B is the only option that lets the payment plumbing go live with
no recurring-billing surface at all, and recurring billing is where both the
legal complexity and the ongoing operational burden live. If B works, A is an
additional SKU type on the same rails, not a rewrite. If B does not work, very
little was spent finding out.

C is tempting because it is nearly free to build — but "nearly free to build" is
the wrong reason to choose a monetization model, and the damage it does to the
earning loop is hard to reverse.

---

## 3. Architecture, provider-agnostic

The single rule everything else follows from: **the client never grants itself
anything.** Entitlements come from the server, and only in response to a
verified message from the payment provider.

```
  client                server                      provider
    │                     │                            │
    │ POST /api/payments/orders {sku}                  │
    ├────────────────────>│                            │
    │                     │ validate sku, price it     │
    │                     │ server-side, create        │
    │                     │ Payment{status:pending}    │
    │                     ├───────────────────────────>│  create payment
    │  confirmation URL   │<───────────────────────────┤
    │<────────────────────┤                            │
    │                                                  │
    │ ───────────── pays on provider's page ──────────>│
    │                     │                            │
    │                     │<───────────────────────────┤  WEBHOOK
    │                     │ verify signature           │
    │                     │ mark paid + grant          │
    │                     │ entitlement (idempotent)   │
    │                     │                            │
    │ GET /api/me/entitlements                         │
    ├────────────────────>│                            │
```

**The webhook is the source of truth, not the browser redirect.** A user who
closes the tab after paying must still get what they bought; a user who forges
the success redirect must get nothing.

### New pieces

| Piece | Where | Notes |
|---|---|---|
| `priceCatalog.js` | `backend/src/config/` | SKU → amount in **minor units** (kopecks, integer), currency, what it grants. Server-authoritative, like the other catalogs. |
| `Payment` model | `backend/src/models/` | `userId, sku, amountMinor, currency, provider, providerPaymentId, status, idempotencyKey, createdAt, paidAt, raw` |
| `entitlements` | on `User` | `[{ sku, grantedAt, source, expiresAt? }]`. `expiresAt` is nullable now and is what makes subscriptions a later addition rather than a migration. |
| `payments.routes.js` | `backend/src/routes/` | create-order (authed) + webhook (**not** authed) |
| `hasEntitlement()` | `backend/src/helpers/` | one function every gated path calls |

### Gotchas specific to this codebase

- **The webhook has no JWT.** It is server-to-server. It must be excluded from
  the auth middleware and authenticated by *signature* instead. Getting this
  wrong in either direction is the classic failure: authed → provider gets 401
  and the user never receives what they paid for; unauthenticated and
  unverified → anyone can grant themselves everything with one `curl`.
- **Signature verification needs the raw body.** `express.json()` parses and
  discards it. The webhook route needs `express.raw({ type: '*/*' })` mounted
  *before* the global JSON parser, or the signature will never match no matter
  how correct the crypto is.
- **Rate limiting.** The backend already rate-limits. Providers retry webhooks
  in bursts; a throttled 429 looks to them like a failure and can eventually
  land the payment in a stuck state. Exempt the webhook path.
- **CORS.** `middleware/cors.js` has an origin allowlist. Irrelevant for the
  webhook (no Origin header), but the *return* URL after payment must be an
  allowed origin — and see the punycode note in `rebranding.md`: browsers send
  малако.рф as `xn--80aa4acdq.xn--p1ai`.
- **nginx.** `/api/` is already proxied, and `client_max_body_size` is already
  raised. Nothing to add, but the webhook must not be cached.
- **Idempotency is not optional.** Providers retry until they get a 2xx, and
  will happily deliver the same event twice. Grant on `providerPaymentId`
  uniqueness, so a replay is a no-op rather than a double grant. Follow the
  `spendCurrency` precedent: make the guard part of the write, not a separate
  read-then-write check.
- **Reconciliation.** Webhooks get lost. A scheduled job that asks the provider
  about `pending` payments older than ~15 minutes is what stops "I paid and got
  nothing" from becoming a support queue. Not optional in practice.
- **Admin panel exists** (`components/Admin/`) — the place to expose a payment
  list, a manual re-grant, and a refund trigger. Cheap to add, and it is the
  difference between handling a support case in a minute and doing it in the
  database by hand.

---

## 4. Provider choice — Russian rails

**This section is the least reliable thing in the document.** Payment provider
availability, terms, and what works for foreign-issued cards have all moved
repeatedly. Treat the names below as candidates to evaluate this week, not as
verified current facts, and confirm directly with each provider before
committing.

Candidates commonly used for RU-facing web products:

- **ЮKassa (YooKassa)** — the usual default. Broad method coverage including
  СБП, and offers 54-ФЗ fiscalization as a bundled service, which is the part
  you least want to build.
- **Т-Касса (T-Bank)** — comparable; often better rates if you already bank there.
- **CloudPayments** — widely used, good subscription support.
- **Robokassa** — lower barrier to entry, historically friendlier to small
  sellers and individual entrepreneurs.

Evaluate on, in roughly this order:

1. Will they onboard **your legal entity** (see §5)? This disqualifies faster
   than anything technical.
2. Do they provide **54-ФЗ fiscalization** as a service? If not, you need a
   cloud cash register separately, and that is a whole second integration.
3. **СБП support** — a large share of RU payment volume.
4. Webhook signature scheme, idempotency guarantees, sandbox quality.
5. Recurring support, if A is ever on the table.
6. Fees.

Design the integration behind one internal interface — `createPayment`,
`verifyWebhook`, `refund` — so the provider is swappable. Given how much this
landscape moves, that is worth the small extra effort up front.

**Stripe, Paddle, LemonSqueezy and similar are not usable for RU-resident
sellers.** Do not build toward them unless the whole business moves abroad,
which is a different plan.

---

## 5. Legal — the part that gates everything

I am not a lawyer and this is not advice. Every line here is a question to put
to an accountant and, for the documents, a lawyer. It is ordered by what blocks
work earliest.

1. **Legal entity.** Acquiring generally requires **ИП** or **ООО**.
   *Самозанятый* (НПД) is the cheapest status but is the most likely to be
   refused by acquirers, especially for recurring payments. **This is the first
   question and it blocks provider selection.** Ask an accountant before writing
   any payment code.
2. **54-ФЗ — fiscal receipts.** Sales to individuals require a чек transmitted
   to ФНС. Most providers sell this as "облачная касса". Confirm it is included
   and who is the receipt's sender of record.
3. **Публичная оферта.** A public offer describing exactly what is sold, for how
   much, for how long, and how it is delivered. Digital goods need to be
   unambiguous about what "access" means.
4. **Refunds (ЗоЗПП).** Consumer protection has specific rules for digital
   goods. Decide the policy *before* launch and make it match what the code
   actually does — a stated policy the software cannot honour is worse than a
   stricter honest one.
5. **152-ФЗ — personal data.** Already in decent shape: Yandex Cloud satisfies
   localization. Payment adds a processing purpose, so the privacy policy and
   consent need updating. Card data itself should never touch your servers —
   redirect or provider-hosted widget only.
6. **Recurring consent**, only if A. Автоплатёж needs its own explicit consent
   and a cancellation path that genuinely works.
7. **Minors.** The audience is language learners, plausibly including under-18s.
   Worth asking how that interacts with the offer and with refunds.
8. **Tax treatment.** НПД / УСН / ОСНО changes both the price you should charge
   and your reporting. Accountant.

---

## 6. Testing

The existing suite covers this shape of problem well and should be extended
before, not after:

- **Add the price catalog to `catalogMirror.test.ts`.** Any client-side price
  display must match the server's authoritative number, for the same reason the
  shop catalogs already do — the shop advertising one price while the server
  charges another is exactly the failure that test exists to prevent.
- **Add `FREE_TRIAL_STORIES` to the same test** once trial length is
  commercially meaningful. It is an unguarded hand-kept mirror today.
- **`hasEntitlement()` deserves the `segmentBounds` treatment** — a pure
  function, unit-tested against expiry boundaries, missing entitlements, and
  the never-expires case, with no database in the loop.
- **Webhook idempotency needs an explicit test**: same event delivered twice
  grants once. This is the single highest-value test in the whole feature.

---

## 7. Suggested phasing

**Phase 0 — decide (no code).** Model from §2, entity from §5.1. Everything
below is blocked on these two answers, and neither is a programming question.

**Phase 1 — entitlements, with no money involved.** Build `entitlements`,
`hasEntitlement()`, and the gates in the UI and API. Ship it with every existing
user granted everything, so nothing changes for anyone. This is the part that
touches the whole app, and it can be built, tested and deployed with zero
payment risk. **Do this first even if payments never happen** — it is also how
you would run a promotion, a school licence, or a manual comp.

**Phase 2 — one provider, sandbox only.** Order creation, webhook, signature
verification, idempotency, reconciliation job. Behind a feature flag, off in
production.

**Phase 3 — fiscalization and documents.** Receipts flowing, oferta and privacy
policy published.

**Phase 4 — live, flagged on for a small group.** Watch reconciliation logs
before opening it up.

**Phase 5 — operations.** Admin panel: payment list, manual grant, refund.
Support will need these on day one, not eventually.

The useful property: **Phase 1 is valuable on its own and carries no legal
exposure.** If the decision in Phase 0 drags, Phase 1 is still worth building.
