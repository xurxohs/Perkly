import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  Start,
  Update,
  Ctx,
  InjectBot,
  On,
  Command,
  Action,
} from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Update()
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {}

  async sendTelegramNotification(telegramId: string, message: string) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
      });
      this.logger.log(`Sent notification to ${telegramId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${telegramId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    // Check if there is a login payload (login_<token>)
    const message = ctx.message;
    let text = '';

    // Type narrow to Text message
    if (message && 'text' in message) {
      text = (message as { text: string }).text;
    }

    const match = text.match(/^\/start login_([a-f0-9-]+)/);

    if (match) {
      const loginToken = match[1];
      // Store the login token in user's session-like context by using chat id as key
      // We keep it simple: store in a local map keyed by telegramId
      this.pendingLogins.set(from.id.toString(), loginToken);

      await ctx.reply(
        `👋 Привет, *${from.first_name}*!\n\nДля входа в *Perkly* нажмите кнопку ниже, чтобы поделиться вашим номером телефона. Это безопасно — мы используем его только для вашей идентификации.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [
              [
                {
                  text: '📱 Поделиться номером телефона',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
      return;
    }

    // Regular /start — just welcome + open app
    const telegramIdStr = from.id.toString();
    const email = `tg_${telegramIdStr}@telegram.local`;

    // Check by telegramId first to avoid unique constraint violation
    const existingByTg = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdStr },
    });
    if (existingByTg) {
      // User already exists, just update display name if needed
      await this.prisma.user.update({
        where: { id: existingByTg.id },
        data: {
          displayName:
            existingByTg.displayName ||
            from.first_name ||
            from.username ||
            'Telegram User',
        },
      });
    } else {
      await this.prisma.user.upsert({
        where: { email },
        update: { telegramId: telegramIdStr },
        create: {
          email,
          telegramId: telegramIdStr,
          displayName: from.first_name || from.username || 'Telegram User',
        },
      });
    }

    const webAppUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await ctx.reply(
      `👋 Привет, *${from.first_name}*!\n\nДобро пожаловать в *Perkly* – маркетплейс скидок, купонов и подписок.\n\n👇 Выберите действие:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🔥 Открыть Perkly', webAppUrl)],
          [
            Markup.button.callback('💰 Мой профиль', 'action_profile'),
            Markup.button.callback('🛍 Мои покупки', 'action_my_purchases'),
          ],
          [Markup.button.callback('❓ Помощь', 'action_help')],
        ]),
      },
    );
  }

  // Map to store pending login tokens: telegramId -> loginToken
  private pendingLogins = new Map<string, string>();

  @On('contact')
  async onContact(@Ctx() ctx: Context) {
    const from = ctx.from;
    const message = ctx.message;

    // Type narrow to Contact message
    if (!from || !message || !('contact' in message) || !message.contact)
      return;

    const contact = message.contact as { phone_number: string };

    const telegramId = from.id.toString();
    const loginToken = this.pendingLogins.get(telegramId);

    if (!loginToken) {
      await ctx.reply(
        '❓ Не нашли активного запроса входа. Вернитесь на сайт и нажмите кнопку ещё раз.',
        {
          reply_markup: { remove_keyboard: true },
        },
      );
      return;
    }

    const phone = contact.phone_number;
    const displayName = from.first_name || from.username || 'Perkly User';

    // Validate phone — +998, +7, +77 (and any other format)
    const normalizedPhone = String(phone).startsWith('+') ? phone : `+${phone}`;

    this.logger.log(`Received contact from ${telegramId}: ${normalizedPhone}`);

    // Resolve the login token in auth service
    await this.authService.resolveLoginToken(
      loginToken,
      telegramId,
      normalizedPhone,
      displayName,
    );

    // Clean up
    this.pendingLogins.delete(telegramId);

    await ctx.reply(
      `✅ *Отлично, ${displayName}!*\n\nВаш номер ${normalizedPhone} подтверждён.\n\n🔙 Вернитесь на сайт — вы уже вошли в аккаунт!`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      },
    );
  }

  @Command('stats')
  async onStatsCommand(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const telegramId = from.id.toString();
    const user = await this.prisma.user.findFirst({ where: { telegramId } });

    if (!user) {
      await ctx.reply(
        'Вы не авторизованы. Нажмите /start и авторизуйтесь через Perkly.',
      );
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySales, totalSales] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          offer: { sellerId: user.id },
          status: 'COMPLETED',
          createdAt: { gte: today },
        },
        _sum: { price: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          offer: { sellerId: user.id },
          status: 'COMPLETED',
        },
        _sum: { price: true },
        _count: { id: true },
      }),
    ]);

    const todayAmount = todaySales._sum.price || 0;
    const todayCount = todaySales._count.id || 0;
    const totalAmount = totalSales._sum.price || 0;
    const totalCount = totalSales._count.id || 0;

    const message = `📊 *Ваша статистика продавца*\n\n*Сегодня:*\n💸 Выручка: $${todayAmount}\n🛍 Покупок: ${todayCount}\n\n*За все время:*\n💸 Выручка: $${totalAmount}\n🛍 Покупок: ${totalCount}\n\nВаш текущий баланс: $${user.balance}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Command('help')
  async onHelpCommand(@Ctx() ctx: Context) {
    const message = `🛠 *Доступные команды:*\n\n/start — Главное меню\n/help — Список команд\n/balance — Ваш профиль и баланс\n/my — Ваши последние покупки\n/stats — Статистика продавца`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Command('balance')
  async onBalanceCommand(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;
    const telegramId = from.id.toString();
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      await ctx.reply(
        'Вы не авторизованы. Нажмите /start и авторизуйтесь через Perkly.',
      );
      return;
    }

    const message = `💰 *Ваш профиль:*\n\nИмя: ${user.displayName}\nБаланс: $${user.balance.toFixed(2)}\nPerkly Points: ${user.rewardPoints}\nТариф: ${user.tier}`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Command('my')
  async onMyCommand(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;
    const telegramId = from.id.toString();
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      await ctx.reply(
        'Вы не авторизованы. Нажмите /start и авторизуйтесь через Perkly.',
      );
      return;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { offer: true },
    });

    if (transactions.length === 0) {
      await ctx.reply('🛍 У вас пока нет покупок.');
      return;
    }

    let message = `🛍 *Ваши последние 5 покупок:*\n\n`;
    transactions.forEach((tx, i) => {
      const status =
        tx.status === 'COMPLETED' || tx.status === 'PAID'
          ? '✅ Оплачено'
          : tx.status;
      message += `${i + 1}. *${tx.offer.title}* — $${tx.price}\nСтатус: ${status}\n`;
      if (
        (tx.status === 'COMPLETED' || tx.status === 'PAID') &&
        tx.offer.hiddenData
      ) {
        message += `Ключ/Данные: \`${tx.offer.hiddenData}\`\n`;
      }
      message += `\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Action('action_help')
  async onActionHelp(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }
    await this.onHelpCommand(ctx);
  }

  @Action('action_profile')
  async onActionProfile(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }
    await this.onBalanceCommand(ctx);
  }

  @Action('action_my_purchases')
  async onActionMyPurchases(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }
    await this.onMyCommand(ctx);
  }
}
