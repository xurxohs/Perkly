import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { NotificationsService } from './notifications/notifications.service';
import { TransactionsService } from './transactions/transactions.service';

describe('AppModule dependency graph', () => {
  let moduleRef: TestingModule;
  const previousEnv = {
    nodeEnv: process.env.NODE_ENV,
    telegramUpdatesEnabled: process.env.TELEGRAM_UPDATES_ENABLED,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    redisUrl: process.env.REDIS_URL,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TELEGRAM_UPDATES_ENABLED = 'false';
    process.env.TELEGRAM_BOT_TOKEN = 'test-only-telegram-token';
    process.env.REDIS_URL = '';

    // Compiling resolves the complete provider graph without calling
    // application lifecycle hooks such as PrismaService.onModuleInit().
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(() => {
    restoreEnv('NODE_ENV', previousEnv.nodeEnv);
    restoreEnv(
      'TELEGRAM_UPDATES_ENABLED',
      previousEnv.telegramUpdatesEnabled,
    );
    restoreEnv('TELEGRAM_BOT_TOKEN', previousEnv.telegramBotToken);
    restoreEnv('REDIS_URL', previousEnv.redisUrl);
  });

  it('resolves the transactions-notifications-bot dependency cycle', () => {
    expect(moduleRef.get(TransactionsService)).toBeInstanceOf(
      TransactionsService,
    );
    expect(moduleRef.get(NotificationsService)).toBeInstanceOf(
      NotificationsService,
    );
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
