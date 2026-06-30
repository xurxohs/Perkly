export type NormalizedPagination = {
  skip: number;
  take: number;
};

export function normalizePagination(
  skip: unknown,
  take: unknown,
  options: { defaultTake?: number; maxTake?: number } = {},
): NormalizedPagination {
  const defaultTake = options.defaultTake ?? 20;
  const maxTake = options.maxTake ?? 100;
  const parsedSkip = parseFiniteNumber(skip);
  const parsedTake = parseFiniteNumber(take);

  return {
    skip:
      parsedSkip !== undefined && parsedSkip > 0 ? Math.floor(parsedSkip) : 0,
    take: Math.min(
      Math.max(
        parsedTake !== undefined ? Math.floor(parsedTake) : defaultTake,
        1,
      ),
      maxTake,
    ),
  };
}

export function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
