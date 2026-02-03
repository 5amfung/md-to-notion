import yaml from 'js-yaml';

export function stripFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlContent = match[1];
  const bodyContent = match[2];
  if (yamlContent === undefined || bodyContent === undefined) {
    return { metadata: {}, body: content };
  }

  try {
    const metadata = (yaml.load(yamlContent) as Record<string, unknown>) || {};
    return { metadata, body: bodyContent };
  } catch {
    // If YAML parsing fails, return empty metadata and body content
    return { metadata: {}, body: bodyContent };
  }
}
