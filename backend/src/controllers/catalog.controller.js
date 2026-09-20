// controllers/catalog.controller.js
//
// GET /api/catalog — what is sold, and for how much.
//
// Public and unauthenticated. The shop has to render real prices and real buy
// buttons for someone who has not signed up yet, because buying is what signs
// them up; gating this endpoint is what would leave a logged-out visitor
// looking at a shelf of stories with no way to buy any of them.
//
// This REPLACES the bundled copy of the catalog the frontend used to ship
// (src/config/priceCatalog.ts's CATALOG_STORIES/PRODUCTS). That copy had to be
// kept in sync by hand and a test, and it could not know about anything created
// in the Story Builder — which is exactly how builder stories ended up with no
// price and no SKU. The prices a customer sees now come from the same catalog
// the server charges against, because they are the same object.
//
// Nothing here is an entitlement decision. It says what a thing costs, never
// who owns it: ownership is GET /user/entitlements, and the audio gate is
// getPublishedStory. A client that lies about this response buys nothing,
// because every order is re-priced server-side from this same catalog.
import { CURRENCY } from "../config/priceCatalog.js";
import { config } from "../config/env.js";
import { isPurchasable } from "../config/basketPricing.js";
import { getCatalog } from "../helpers/catalogStore.js";

export async function getCatalogConfig(req, res) {
  try {
    const catalog = await getCatalog();

    res.json({
      currency: CURRENCY,
      // Is anything gated by ownership right now? The client keeps its own
      // copy of the access rule for stories that have no published DB row
      // (see applyCatalogAccess), so it has to be told, or it would keep
      // padlocking content this server will happily serve.
      paywallEnabled: config.payments.paywallEnabled,
      // Every story the catalog knows, with the paywall shape the player needs
      // to draw a level grid before it has asked for any audio.
      stories: catalog.stories.map((s) => ({
        key: s.key,
        character: s.character,
        parts: s.parts,
        category: s.category,
        paid: s.paid,
        freeParts: s.freeParts,
        previewSeconds: s.previewSeconds,
      })),
      // `purchasable` here is the ENVIRONMENT's answer, not the catalog's:
      // isPurchasable folds in PURCHASABLE_SKUS, so staging can offer
      // placeholder stories production refuses. Reading the raw catalog flag
      // instead is what once made the shop and the paywall modal disagree.
      products: catalog.products.map((p) => ({
        sku: p.sku,
        kind: p.kind,
        amountMinor: p.amountMinor,
        parts: p.parts,
        storyKeys: p.storyKeys,
        durationDays: p.durationDays,
        purchasable: isPurchasable(p.sku, config.payments.purchasableSkus, catalog),
        ...(p.character ? { character: p.character } : {}),
        ...(p.difficulty ? { difficulty: p.difficulty } : {}),
        ...(p.storyKey ? { storyKey: p.storyKey } : {}),
      })),
    });
  } catch (error) {
    console.error("getCatalogConfig error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
