import * as cheerio from "cheerio";

/**
 * Shared HTML cleanup for poets.org poem bodies.
 * We keep a tiny allowlist and preserve simple indentation cues when present.
 */
export function sanitizePoemHtml(html: string): string {
  const $ = cheerio.load(html, null, false);
  const allowed = new Set(["em", "i", "br", "span", "p"]);

  $("*").each((_, element) => {
    const current = $(element);
    const tagName = String(current.prop("tagName") ?? "").toLowerCase();

    if (!allowed.has(tagName)) {
      current.replaceWith(current.html() ?? current.text());
      return;
    }

    const style = indentationStyle(current.attr("class") ?? "", current.text());
    for (const attr of Object.keys(current.attr() ?? {})) {
      current.removeAttr(attr);
    }
    if (style) current.attr("style", style);
  });

  return $.html().trim();
}

function indentationStyle(className: string, text: string): string {
  const classIndent = className.match(/indent-?(\d+)?/i)?.[1];
  const leadingSpaces = text.match(/^(\s+)/)?.[1]?.length ?? 0;
  const level = Number(classIndent ?? Math.min(leadingSpaces, 8));

  return level > 0 ? `padding-left:${Math.min(level, 8) * 0.75}em` : "";
}
