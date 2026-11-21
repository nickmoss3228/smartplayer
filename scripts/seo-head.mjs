// Plain-JS twin of src/seo/meta.ts (renderHeadTags + storyMeta), because the
// build script cannot import TypeScript. src/seo/staticPages.test.ts keeps the
// two in sync; change them together.

export const ORIGIN = "https://xn--80aa4acdq.xn--p1ai";
export const DEFAULT_IMAGE = "/icons/icon-512.png";

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const absoluteImage = (image) => (/^https?:\/\//i.test(image) ? image : ORIGIN + image);

export const renderHeadTags = (meta) => {
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

export const trimDescription = (text, max = 160) => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, "") + "…";
};

export const storyMeta = (pathname, story, levelDescription) => {
  const part = pathname.split("/").filter(Boolean)[3];
  const title = part
    ? `${story.title}, часть ${part} · малако`
    : `${story.title} — история на английском · малако`;
  const description = trimDescription(story.description) || levelDescription;
  const meta = { title, description, path: pathname };
  if (story.coverUrl) meta.image = story.coverUrl;
  return meta;
};

// Removes the head tags a page already carries for the set above, then
// inserts the new block just before </head>.
export const injectHead = (html, meta) => {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/g, "")
    .replace(/<meta\s+(?:name="(?:description|twitter:card)"|property="og:[a-z_:]+")[^>]*?\/?>\s*/g, "")
    .replace(/<link\s+rel="canonical"[^>]*?\/?>\s*/g, "");
  return stripped.replace(/\s*<\/head>/, `\n    ${renderHeadTags(meta)}\n  </head>`);
};
