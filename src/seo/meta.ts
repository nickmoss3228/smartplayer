import pages from "./pages.json";

export type PageMeta = { title: string; description: string; path?: string; image?: string };

export const ORIGIN = "https://xn--80aa4acdq.xn--p1ai";
// Square for now; a designed 1200x630 card is a later task.
export const DEFAULT_IMAGE = "/icons/icon-512.png";

const table = pages as Record<string, { title: string; description: string }>;
const DIFFICULTIES = ["easy", "medium", "hard"];

export const resolveMeta = (pathname: string): PageMeta => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
  const hit = table[path];
  if (hit) return { ...hit, path };

  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "levels" && DIFFICULTIES.includes(seg[1]) && (seg.length === 3 || seg.length === 4)) {
    const description = table[`/levels/${seg[1]}`].description;
    return seg.length === 3
      ? { title: "История на английском · малако", description, path }
      : { title: `Часть ${seg[3]} · малако`, description, path };
  }
  return { title: "малако", description: table["/"].description };
};

export const trimDescription = (text: string | undefined, max = 160): string => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "") + "…";
};

export const storyMeta = (
  pathname: string,
  story: { title: string; description?: string; coverUrl?: string | null }
): PageMeta => {
  const base = resolveMeta(pathname);
  const part = pathname.split("/").filter(Boolean)[3];
  const title = part
    ? `${story.title}, часть ${part} · малако`
    : `${story.title} — история на английском · малако`;
  const meta: PageMeta = {
    title,
    description: trimDescription(story.description) || base.description,
    path: pathname,
  };
  if (story.coverUrl) meta.image = story.coverUrl;
  return meta;
};

const absoluteImage = (image: string) => (/^https?:\/\//i.test(image) ? image : ORIGIN + image);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The same tag set applyMeta writes, as HTML. scripts/seo-head.mjs has a JS
// twin used at build time; staticPages.test.ts keeps them identical.
export const renderHeadTags = (meta: PageMeta): string => {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
  ];
  if (meta.path) lines.push(`<link rel="canonical" href="${escapeHtml(ORIGIN + meta.path)}" />`);
  lines.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="малако" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`
  );
  if (meta.path) lines.push(`<meta property="og:url" content="${escapeHtml(ORIGIN + meta.path)}" />`);
  lines.push(
    `<meta property="og:image" content="${escapeHtml(absoluteImage(meta.image ?? DEFAULT_IMAGE))}" />`,
    `<meta name="twitter:card" content="summary" />`
  );
  return lines.join("\n    ");
};

const upsert = (doc: Document, selector: string, create: () => Element): Element => {
  let el = doc.head.querySelector(selector);
  if (!el) {
    el = create();
    doc.head.appendChild(el);
  }
  return el;
};

const setMeta = (doc: Document, attr: "name" | "property", key: string, value: string) => {
  const el = upsert(doc, `meta[${attr}="${key}"]`, () => {
    const m = doc.createElement("meta");
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute("content", value);
};

export const applyMeta = (meta: PageMeta, doc: Document = document): void => {
  doc.title = meta.title;
  setMeta(doc, "name", "description", meta.description);

  if (meta.path) {
    const href = ORIGIN + meta.path;
    const link = upsert(doc, 'link[rel="canonical"]', () => {
      const l = doc.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    });
    link.setAttribute("href", href);
    setMeta(doc, "property", "og:url", href);
  } else {
    doc.head.querySelector('link[rel="canonical"]')?.remove();
    doc.head.querySelector('meta[property="og:url"]')?.remove();
  }

  setMeta(doc, "property", "og:type", "website");
  setMeta(doc, "property", "og:site_name", "малако");
  setMeta(doc, "property", "og:locale", "ru_RU");
  setMeta(doc, "property", "og:title", meta.title);
  setMeta(doc, "property", "og:description", meta.description);
  setMeta(doc, "property", "og:image", absoluteImage(meta.image ?? DEFAULT_IMAGE));
  setMeta(doc, "name", "twitter:card", "summary");
};
