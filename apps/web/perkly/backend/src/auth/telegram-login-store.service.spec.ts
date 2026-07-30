import { TelegramLoginStore } from './telegram-login-store.service';

describe('TelegramLoginStore', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  let store: TelegramLoginStore;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    store = new TelegramLoginStore();
  });

  afterAll(() => {
    if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
  });

  it('keeps a claimed token associated with exactly one Telegram account', async () => {
    const token = await store.create({ flow: 'link', userId: 'user-1' });

    await expect(store.claim(token, 'tg-1')).resolves.toMatchObject({
      session: expect.objectContaining({ telegramId: 'tg-1' }),
    });
    await expect(store.tokenForTelegram('tg-1')).resolves.toBe(token);
    await expect(store.claim(token, 'tg-2')).resolves.toMatchObject({
      error: expect.stringContaining('другом Telegram'),
    });
  });

  it('keeps the completed result pollable but removes the Telegram reverse key', async () => {
    const token = await store.create({ flow: 'login' });
    const claimed = await store.claim(token, 'tg-1');
    const session = claimed.session!;

    await store.complete(token, { ...session, status: 'resolved', jwt: 'jwt' });

    await expect(store.get(token)).resolves.toMatchObject({
      status: 'resolved',
      jwt: 'jwt',
    });
    await expect(store.tokenForTelegram('tg-1')).resolves.toBeNull();
  });
});
