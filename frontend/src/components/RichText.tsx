import type { ReactNode } from 'react';

const LINK_PATTERN_SOURCE = String.raw`\[([^\]]+)\]\(([^)\s]+)\)|\(([^)]+)\)\[([^\]\s]+)\]|(https?:\/\/[^\s<>]+)`;

export function toSafeHref(value?: string | null): string | null {
  if (!value) return null;
  const href = value.trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const parsed = new URL(href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function textWithBreaks(value: string, keyPrefix: string): ReactNode[] {
  return value.split('\n').flatMap((line, index, lines) => [
    line,
    ...(index < lines.length - 1 ? [<br key={`${keyPrefix}-br-${index}`} />] : []),
  ]);
}

export function RichText({ children, className }: { children?: string | null; className?: string }) {
  const source = children ?? '';
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const pattern = new RegExp(LINK_PATTERN_SOURCE, 'g');

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) nodes.push(...textWithBreaks(source.slice(cursor, match.index), `text-${key}`));
    const label = match[1] || match[3] || match[5];
    const href = toSafeHref(match[2] || match[4] || match[5]);
    if (href) {
      const external = !href.startsWith('/');
      nodes.push(<a key={`link-${key}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer nofollow' : undefined}>{label}</a>);
    } else {
      nodes.push(match[0]);
    }
    cursor = pattern.lastIndex;
    key += 1;
  }
  if (cursor < source.length) nodes.push(...textWithBreaks(source.slice(cursor), `tail-${key}`));

  return <span className={className}>{nodes}</span>;
}
