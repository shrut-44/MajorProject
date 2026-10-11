/**
 * Strip markdown formatting, HTML comments, image references,
 * and issue templates from text to produce clean embedding input.
 */
export function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";

  let text = raw;

  // Remove HTML comments (<!-- ... -->)
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Remove image references ![alt](url) and HTML img tags
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");
  text = text.replace(/<img[^>]*>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Remove issue/PR template headers (### headings with checkboxes)
  text = text.replace(/^###?\s+.*$/gm, "");
  text = text.replace(/^- \[[ x]\]\s+.*$/gm, "");

  // Remove code blocks (``` ... ```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  text = text.replace(/`[^`]+`/g, "");

  // Remove markdown links but keep the text [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove markdown bold/italic markers
  text = text.replace(/[*_]{1,3}/g, "");

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, "");

  // Remove blockquote markers
  text = text.replace(/^>\s?/gm, "");

  // Collapse multiple newlines/whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");

  return text.trim();
}

/**
 * Build the embedding text from issue fields.
 * Keep this format stable — changing it means re-embedding everything.
 */
export function buildEmbeddingText(
  repoName: string,
  language: string | null,
  labels: string[],
  title: string,
  body: string | null
): string {
  const cleanedBody = cleanText(body).slice(0, 1500);

  return [
    `Repo: ${repoName}`,
    `Language: ${language ?? "unknown"}`,
    `Labels: ${labels.join(", ")}`,
    `Title: ${title}`,
    `Body: ${cleanedBody}`,
  ].join("\n");
}
