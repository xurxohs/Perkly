import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('evicts the oldest live entry when the configured bound is reached', () => {
    const cache = new TtlCache(2);
    cache.set('first', 1, 60_000);
    cache.set('second', 2, 60_000);
    cache.set('third', 3, 60_000);

    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBe(2);
    expect(cache.get('third')).toBe(3);
  });

  it('prunes expired entries before applying the bound', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValue(2_000);
    const cache = new TtlCache(1);
    cache.set('expired', 1, 1);
    cache.set('current', 2, 60_000);

    expect(cache.get('current')).toBe(2);
    jest.restoreAllMocks();
  });
});
