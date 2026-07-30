import { BadRequestException } from '@nestjs/common';

const BLOCKED_PATTERNS = [
  /\b(?:fuck|shit|bitch|nazi)\b/i,
  /(?<!\p{L})(?:сука|бля(?:дь)?|нацист)(?!\p{L})/iu,
  /\b(?:fohisha|natsist)\b/i,
  /(?<!\p{L})f[\s._*+\-=/|]*u[\s._*+\-=/|]*c[\s._*+\-=/|]*k(?!\p{L})/iu,
  /(?<!\p{L})б[\s._*+\-=/|]*л[\s._*+\-=/|]*я(?:[\s._*+\-=/|]*д[\s._*+\-=/|]*ь)?(?!\p{L})/iu,
];

export function assertAcceptableUserContent(value: string, field = 'Content') {
  const normalized = value
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!]/g, 'i');
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new BadRequestException(`${field} violates community guidelines`);
  }
  const links = normalized.match(/https?:\/\//gi)?.length ?? 0;
  if (links > 3) {
    throw new BadRequestException(`${field} contains too many links`);
  }
}
