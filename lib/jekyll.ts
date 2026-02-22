import yaml from 'js-yaml';
import type { JekyllConfig } from './types';

export interface FrontMatter {
  [key: string]: unknown;
}

export function parseFrontMatter(raw: string): { frontMatter: FrontMatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontMatter: {}, body: raw };
  }
  try {
    const frontMatter = (yaml.load(match[1]) as FrontMatter) ?? {};
    return { frontMatter, body: match[2] };
  } catch {
    return { frontMatter: {}, body: raw };
  }
}

export function serializeFrontMatter(fm: FrontMatter, body: string): string {
  const yamlStr = yaml.dump(fm, { lineWidth: -1, quotingType: '"', forceQuotes: false });
  return `---\n${yamlStr}---\n${body}`;
}

export function generatePostFilename(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}-${slug}.md`;
}

export function parseConfig(raw: string): JekyllConfig {
  const data = (yaml.load(raw) as Record<string, unknown>) ?? {};
  return {
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    theme: data.theme as string | undefined,
    plugins: Array.isArray(data.plugins) ? data.plugins : [],
    header_pages: Array.isArray(data.header_pages) ? data.header_pages : [],
    ...data,
  };
}

export function serializeConfig(config: JekyllConfig): string {
  return yaml.dump(config, { lineWidth: -1, quotingType: '"', forceQuotes: false });
}
