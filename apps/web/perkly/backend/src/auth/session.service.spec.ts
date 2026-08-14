import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const prisma = {
    userSession: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const notifications = { sendPushNotification: jest.fn() };
  const service = new SessionService(
    prisma as never,
    jwt as never,
    notifications as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('keeps JWT out of browser responses and sets an HttpOnly cookie', () => {
    const header = jest.fn();
    const result = service.present(
      { headers: {} } as FastifyRequest,
      { header } as unknown as FastifyReply,
      {
        access_token: 'secret-token',
        user: {
          email: 'user@example.com',
          sub: 'user-1',
          role: 'USER',
          tier: 'SILVER',
          sid: 'session-1',
        },
      },
    );

    expect(result).not.toHaveProperty('access_token');
    expect(header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('HttpOnly'),
    );
  });

  it('returns JWT only to an explicitly identified mobile client', () => {
    const result = service.present(
      { headers: { 'x-client-platform': 'ios' } } as unknown as FastifyRequest,
      { header: jest.fn() } as unknown as FastifyReply,
      {
        access_token: 'mobile-token',
        user: {
          email: 'user@example.com',
          sub: 'user-1',
          role: 'USER',
          tier: 'SILVER',
          sid: 'session-1',
        },
      },
    );

    expect(result).toHaveProperty('access_token', 'mobile-token');
  });

  it('creates one persisted session and signs a token containing its id', async () => {
    prisma.userSession.count.mockResolvedValue(0);
    prisma.userSession.create.mockResolvedValue({ id: 'session-1' });

    await service.issue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
      tier: 'SILVER',
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', sid: 'session-1' }),
    );
  });
});
