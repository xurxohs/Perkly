import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let botService: { sendTelegramNotification: jest.Mock };
  let provider: { send: jest.Mock };
  const originalBundleId = process.env.APN_BUNDLE_ID;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    botService = { sendTelegramNotification: jest.fn() };
    provider = { send: jest.fn() };
    service = new NotificationsService(prisma as never, botService as never);
    (service as unknown as { apnProvider: typeof provider }).apnProvider = provider;
    process.env.APN_BUNDLE_ID = 'com.perkly.app.dev';
  });

  afterEach(() => {
    process.env.APN_BUNDLE_ID = originalBundleId;
    jest.clearAllMocks();
  });

  it('returns account notification preferences', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      notifyPurchases: true,
      notifyMessages: false,
      notifyNearby: true,
    });

    await expect(service.getPreferences('user-1')).resolves.toEqual({
      purchases: true,
      messages: false,
      nearby: true,
    });
  });

  it('updates only supplied notification preferences', async () => {
    prisma.user.update.mockResolvedValue({
      notifyPurchases: true,
      notifyMessages: false,
      notifyNearby: true,
    });

    await service.updatePreferences('user-1', { messages: false });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { notifyMessages: false },
      select: {
        notifyPurchases: true,
        notifyMessages: true,
        notifyNearby: true,
      },
    });
  });

  it('does not send a disabled message notification through any channel', async () => {
    prisma.user.findUnique.mockResolvedValue({
      deviceToken: 'token-1',
      telegramId: 'telegram-1',
      notifyPurchases: true,
      notifyMessages: false,
    });

    await service.sendPushNotification('user-1', 'Title', 'Body', {
      roomId: 'room-1',
    });

    expect(botService.sendTelegramNotification).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('removes a token rejected by APNs without logging the token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      deviceToken: 'invalid-token',
      telegramId: null,
      notifyPurchases: true,
      notifyMessages: true,
    });
    provider.send.mockResolvedValue({
      sent: [],
      failed: [
        {
          device: 'invalid-token',
          status: '410',
          response: { reason: 'Unregistered' },
        },
      ],
    });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    await service.sendPushNotification('user-1', 'Title', 'Body');

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', deviceToken: 'invalid-token' },
      data: { deviceToken: null },
    });
  });
});
