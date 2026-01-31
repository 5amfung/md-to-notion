import yaml from "js-yaml";

export function stripFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const metadata = (yaml.load(match[1]!) as Record<string, unknown>) || {};
  return { metadata, body: match[2]! };
}
