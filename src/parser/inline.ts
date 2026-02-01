import path from 'node:path';

export type InlineAnnotations = {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  color?: string;
};

export type InlineSegment =
  | {
      type: 'text';
      text: string;
      annotations?: InlineAnnotations;
      link?: string | null;
    }
  | {
      type: 'wiki_link';
      target: string;
      display: string;
    }
  | {
      type: 'equation';
      text: string;
    };

type MatchHandler = (match: RegExpMatchArray) => InlineSegment[];

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function replaceFootnoteRefs(text: string): string {
  return text.replace(/\[\^(\d+)\]/g, (_, num) => {
    return String(num)
      .split('')
      .map((digit: string) => SUPERSCRIPTS[Number.parseInt(digit, 10)])
      .join('');
  });
}

function isRelativeMarkdownLink(url: string): boolean {
  if (/^https?:\/\//i.test(url)) return false;
  return /\.md($|[?#])/i.test(url) || !/^[a-z]+:/i.test(url);
}

export function toStyledInternalText(text: string): InlineSegment[] {
  return [
    {
      type: 'text',
      text,
      annotations: { bold: true, color: 'blue' },
    },
  ];
}

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let remaining = text;

  const patterns: { regex: RegExp; handler: MatchHandler }[] = [
    {
      regex: /\$([^$]+)\$/,
      handler: (match) => [{ type: 'equation', text: match[1] ?? '' }],
    },
    {
      regex: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/,
      handler: (match) => {
        const target = match[1] ?? '';
        const display = match[2] ?? target;
        return [{ type: 'wiki_link', target, display }];
      },
    },
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/,
      handler: (match) => {
        const label = match[1] ?? '';
        const url = match[2] ?? '';
        if (isRelativeMarkdownLink(url)) {
          return [{ type: 'wiki_link', target: url, display: label }];
        }
        return [
          {
            type: 'text',
            text: label,
            link: url,
          },
        ];
      },
    },
    {
      regex: /==([^=]+)==/,
      handler: (match) => [
        {
          type: 'text',
          text: match[1] ?? '',
          annotations: { color: 'yellow_background' },
        },
      ],
    },
    {
      // Bold + Italic: ***text*** or ___text___
      regex: /\*\*\*([^*]+)\*\*\*/,
      handler: (match) => [
        {
          type: 'text',
          text: match[1] ?? '',
          annotations: { bold: true, italic: true },
        },
      ],
    },
    {
      regex: /___([^_]+)___/,
      handler: (match) => [
        {
          type: 'text',
          text: match[1] ?? '',
          annotations: { bold: true, italic: true },
        },
      ],
    },
    {
      regex: /\*\*([^*]+)\*\*/,
      handler: (match) => [
        { type: 'text', text: match[1] ?? '', annotations: { bold: true } },
      ],
    },
    {
      regex: /__([^_]+)__/,
      handler: (match) => [
        { type: 'text', text: match[1] ?? '', annotations: { bold: true } },
      ],
    },
    {
      regex: /`([^`]+)`/,
      handler: (match) => [
        { type: 'text', text: match[1] ?? '', annotations: { code: true } },
      ],
    },
    {
      regex: /~~([^~]+)~~/,
      handler: (match) => [
        {
          type: 'text',
          text: match[1] ?? '',
          annotations: { strikethrough: true },
        },
      ],
    },
    {
      regex: /\*([^*]+)\*/,
      handler: (match) => [
        { type: 'text', text: match[1] ?? '', annotations: { italic: true } },
      ],
    },
    {
      regex: /_([^_]+)_/,
      handler: (match) => [
        { type: 'text', text: match[1] ?? '', annotations: { italic: true } },
      ],
    },
  ];

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      match: RegExpMatchArray;
      handler: MatchHandler;
    } | null = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            match,
            handler: pattern.handler,
          };
        }
      }
    }

    if (!earliestMatch) {
      if (remaining) {
        segments.push({ type: 'text', text: remaining });
      }
      break;
    }

    if (earliestMatch.index > 0) {
      segments.push({
        type: 'text',
        text: remaining.slice(0, earliestMatch.index),
      });
    }

    segments.push(...earliestMatch.handler(earliestMatch.match));

    remaining = remaining.slice(
      earliestMatch.index + earliestMatch.match[0].length
    );
  }

  return segments;
}

export function resolveImagePath(
  markdownFilePath: string,
  imagePath: string
): string {
  const decodedPath = decodeURIComponent(imagePath);
  const mdDir = path.dirname(markdownFilePath);
  return path.resolve(mdDir, decodedPath);
}
