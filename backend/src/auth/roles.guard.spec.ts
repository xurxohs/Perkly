import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from './roles.guard';

function contextFor(user?: { userId: string }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('lets routes without required roles pass without a database lookup', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks a B2C user from B2B seller routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(['VENDOR', 'ADMIN']);
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });

    await expect(
      guard.canActivate(contextFor({ userId: 'b2c-user-1' })),
    ).resolves.toBe(false);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'b2c-user-1' },
      select: { role: true },
    });
  });

  it.each(['VENDOR', 'ADMIN'])(
    'allows %s users into B2B seller routes',
    async (role) => {
      reflector.getAllAndOverride.mockReturnValue(['VENDOR', 'ADMIN']);
      prisma.user.findUnique.mockResolvedValue({ role });

      await expect(
        guard.canActivate(contextFor({ userId: `${role.toLowerCase()}-1` })),
      ).resolves.toBe(true);
    },
  );

  it('blocks role-protected routes when the user is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['VENDOR', 'ADMIN']);

    await expect(guard.canActivate(contextFor())).resolves.toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
