// ─── iMessage Output Sanitizer ───────────────────────────────────────────────
// Ensures clean, crisp, link-detectable plain text for iMessage bubbles.
// Removes broken HTML, unescapes entities, and strips raw markdown syntax.

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&#8212;": "—",
  "&#8211;": "–",
  "&#8216;": "'",
  "&#8217;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
};

export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  let decoded = text;
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.split(entity).join(replacement);
  }
  // Decimal numeric entities &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    try {
      return String.fromCharCode(parseInt(code, 10));
    } catch {
      return "";
    }
  });
  // Hex entities &#x1a;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "";
    }
  });
  return decoded;
}

/**
 * Sanitizes any raw agent output into clean, native iMessage bubble formatting:
 * 1. Unescapes HTML entities.
 * 2. Strips raw HTML tags from web scrapers.
 * 3. Converts markdown links [Label](url) into clickable naked URLs that iOS iMessage auto-previews.
 * 4. Strips markdown asterisks (*italic*, **bold**), hash headers (###), code blocks, and table pipes.
 * 5. Formats lists with clean bullets (•) and proper spacing.
 * 6. Normalizes line breaks to avoid unnecessary blank bubbles on mobile screens.
 */
export function sanitizeForIMessage(text: string): string {
  if (!text) return "";

  let res = decodeHtmlEntities(text);

  // 1. Strip raw HTML tags
  res = res.replace(/<[^>]+>/g, "");

  // 2. Convert markdown links [Label](url)
  // In iMessage, raw URLs on their own or with clean labels become rich tap targets / preview cards.
  res = res.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
    const trimmedLabel = label.trim();
    if (
      !trimmedLabel ||
      /^(link|apply|here|url|website|source|click here|apply now|view listing)$/i.test(trimmedLabel) ||
      trimmedLabel === url
    ) {
      return url;
    }
    return `${trimmedLabel}: ${url}`;
  });

  // 3. Remove markdown headers (#, ##, ###)
  res = res.replace(/^#{1,6}\s+/gm, "");

  // 4. Remove bold & italic markdown asterisks and underscores
  res = res.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  res = res.replace(/\*\*([^*]+)\*\*/g, "$1");
  res = res.replace(/\*([^*\n]+)\*/g, "$1");
  res = res.replace(/___([^_]+)___/g, "$1");
  res = res.replace(/__([^_]+)__/g, "$1");
  // Keep single underscores in identifiers (like next_js), replace standalone _emphasis_
  res = res.replace(/(^|\s)_([^_]+)_(\s|$|[.,!?])/g, "$1$2$3");

  // 5. Remove strikethrough ~~text~~
  res = res.replace(/~~([^~]+)~~/g, "$1");

  // 6. Remove code blocks and inline backticks
  res = res.replace(/```[a-z]*\n([\s\S]*?)\n```/gi, "$1");
  res = res.replace(/`([^`]+)`/g, "$1");

  // 7. Normalize markdown list dashes/asterisks at start of lines into clean bullets
  res = res.replace(/^[\*\-]\s+/gm, "• ");

  // 8. Prevent URLs from sticking to parentheses or trailing punctuation so iOS link parser works cleanly
  res = res.replace(/\((https?:\/\/[^\s)]+)\)/g, " $1 ");

  // 9. Clean excessive empty lines and trailing whitespace
  res = res.replace(/\r\n/g, "\n");
  res = res.replace(/[ \t]+$/gm, "");
  res = res.replace(/\n{3,}/g, "\n\n");

  return res.trim();
}
