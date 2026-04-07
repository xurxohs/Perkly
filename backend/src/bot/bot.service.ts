import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionsService } from '../transactions/transactions.service';
import { OffersService } from '../offers/offers.service';
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
import { Transaction, User, Offer } from '@prisma/client';

@Update()
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
    private offersService: OffersService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {}

  async sendTelegramNotification(
    telegramId: string,
    message: string,
    replyMarkup?: any,
  ) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
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

    const message = ctx.message;
    let text = '';
    if (message && 'text' in message) {
      text = (message as { text: string }).text;
    }

    const telegramIdStr = from.id.toString();
    const email = `tg_${telegramIdStr}@telegram.local`;

    let user = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdStr },
    });
    let isNewUser = false;

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName:
            user.displayName ||
            from.first_name ||
            from.username ||
            'Telegram User',
        },
      });
    } else {
      isNewUser = true;
      user = await this.prisma.user.upsert({
        where: { email },
        update: { telegramId: telegramIdStr },
        create: {
          email,
          telegramId: telegramIdStr,
          displayName: from.first_name || from.username || 'Telegram User',
        },
      });
    }

    const match = text.match(/^\/start (login_|ref_|gift_)([a-zA-Z0-9-]+)/);

    if (match) {
      const type = match[1];
      const token = match[2];

      if (type === 'login_') {
        this.pendingLogins.set(telegramIdStr, token);
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
      } else if (type === 'ref_' && isNewUser) {
        const referrerId = token;
        const existingRef = await this.prisma.analyticsEvent.findFirst({
          where: { eventType: 'REFERRAL', userId: user.id },
        });
        if (!existingRef && referrerId !== user.id) {
          await this.prisma.user
            .update({
              where: { id: referrerId },
              data: { rewardPoints: { increment: 500 } },
            })
            .catch(() => null);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { rewardPoints: { increment: 500 } },
          });
          await this.prisma.analyticsEvent.create({
            data: {
              eventType: 'REFERRAL',
              userId: user.id,
              metadata: referrerId,
            },
          });
          await ctx.reply(
            `🎉 Вы зарегистрировались по приглашению и получили 500 Perkly Points!`,
          );
          // Alert referrer
          const referrer = await this.prisma.user.findUnique({
            where: { id: referrerId },
          });
          if (referrer && referrer.telegramId) {
            await this.sendTelegramNotification(
              referrer.telegramId,
              `🤝 По вашей ссылке зарегистрировался друг! Вам начислено 500 Perkly Points. Зарабатывайте дальше!`,
            );
          }
        }
        return;
      } else if (type === 'gift_') {
        const giftCode = token;
        try {
          await this.transactionsService.redeemGift(giftCode, user.id);
          await ctx.reply(
            `🎁 *Подарок активирован!*\n\nВы успешно получили товар. Проверьте ваш профиль в приложении.`,
            { parse_mode: 'Markdown' },
          );
        } catch (error) {
          await ctx.reply(
            `❌ *Ошибка активации:* ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            { parse_mode: 'Markdown' },
          );
        }
        return;
      }
    }

    const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
    await ctx.reply(
      `👋 Привет, *${from.first_name}*!\n\nДобро пожаловать в *Perkly* – маркетплейс скидок, купонов и подписок.\n\n👇 Выберите действие:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🔥 Открыть Perkly', webAppUrl)],
          [
            Markup.button.webApp('📍 Рядом со мной', `${webAppUrl}/catalog?near=true`),
            Markup.button.callback('💰 Профиль', 'action_profile'),
          ],
          [
            Markup.button.callback('🛍 Покупки', 'action_my_purchases'),
            Markup.button.callback('🤝 Пригласить', 'action_referral'),
          ],
          [
            Markup.button.callback('🎁 Бонус дня', 'action_bonus'),
            Markup.button.callback('❓ Помощь', 'action_help'),
          ],
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

  @Command('nearby')
  async onNearbyCommand(@Ctx() ctx: Context) {
    await ctx.reply(
      '📍 Чтобы найти лучшие предложения рядом с вами, нажмите кнопку ниже и поделитесь своим местоположением.',
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: '📍 Поделиться местоположением',
                request_location: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }

  @On('location')
  async onLocation(@Ctx() ctx: Context) {
    const from = ctx.from;
    const message = ctx.message;

    if (!from || !message || !('location' in message) || !message.location)
      return;

    const { latitude, longitude } = message.location as {
      latitude: number;
      longitude: number;
    };

    const offers = await this.offersService.findAllFiltered({
      lat: latitude,
      lng: longitude,
      radiusKm: 3, // As per user request
      take: 5,
    });

    if (offers.data.length === 0) {
      await ctx.reply(
        '😔 К сожалению, в радиусе 3 км пока нет активных предложений. Попробуйте позже или поищите в полном каталоге!',
        {
          reply_markup: { remove_keyboard: true },
        },
      );
      return;
    }

    let response = `📍 *Предложения рядом с вами (3 км):*\n\n`;
    const startPayload = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ')[1] : null;

    if (startPayload?.startsWith('gift_')) {
      const code = startPayload.replace('gift_', '');
      const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
      await ctx.reply(`🎁 *У вас подарок!*\n\nНажмите кнопку ниже, чтобы забрать его.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎁 Забрать подарок', `${webAppUrl}/profile/redeem?code=${code}`)]
        ])
      });
      return;
    }

    if (startPayload?.startsWith('squad_')) {
      const code = startPayload.replace('squad_', '');
      const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
      await ctx.reply(`👥 *Вас пригласили в сквад!* 🎉\n\nОбъединяйтесь с друзьями, чтобы достигать общих целей и получать Mega Perks (кешбэк 15%).`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🤝 Вступить в сквад', `${webAppUrl}/profile/squad?join=${code}`)]
        ])
      });
      return;
    }

    const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
    offers.data.forEach((offer, i) => {
      response += `${i + 1}. *${offer.title}* — $${offer.price}\n`;
    });

    await ctx.reply(response, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🔥 Открыть все рядом', `${webAppUrl}/catalog?lat=${latitude}&lng=${longitude}&radiusKm=3`)],
        [Markup.button.callback('🔙 В меню', 'action_main_menu')],
      ]),
      reply_markup: { remove_keyboard: true },
    });
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

  @Command('bonus')
  async onBonusCommand(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;
    const telegramIdStr = from.id.toString();
    const user = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdStr },
    });
    if (!user) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingBonus = await this.prisma.analyticsEvent.findFirst({
      where: {
        eventType: 'DAILY_BONUS',
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    });

    if (existingBonus) {
      await ctx.reply(
        '🎁 Вы уже получали бонус сегодня! Следующий будет доступен завтра.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const bonusAmount = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { rewardPoints: { increment: bonusAmount } },
    });

    await this.prisma.analyticsEvent.create({
      data: {
        eventType: 'DAILY_BONUS',
        userId: user.id,
        metadata: bonusAmount.toString(),
      },
    });

    await ctx.reply(
      `🎉 Ура! Вы крутанули рулетку Фортуны и забрали: *${bonusAmount} Perkly Points*!\nЖдем вас завтра за новой наградой.`,
      { parse_mode: 'Markdown' },
    );
  }

  @Action('action_bonus')
  async onActionBonus(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await this.onBonusCommand(ctx);
  }

  @Action('action_main_menu')
  async onActionMainMenu(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await this.start(ctx);
  }

  @Action('action_referral')
  async onActionReferral(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const from = ctx.from;
    if (!from) return;
    const user = await this.prisma.user.findUnique({
      where: { telegramId: from.id.toString() },
    });
    if (!user) return;

    const botInfo = ctx.botInfo;
    const botUsername = botInfo?.username || 'PerklyLoginBot';
    const refLink = `https://t.me/${botUsername}?start=ref_${user.id}`;

    await ctx.reply(
      `🎁 *Пригласи друга и получи 500 баллов!*\n\nПоделитесь этой ссылкой с друзьями. Как только друг присоединится к Perkly, вы оба получите награду!\n\n👇 Ваша персональная ссылка:\n\`${refLink}\``,
      { parse_mode: 'Markdown' },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async handleSubscriptionRenewals() {
    this.logger.log('Checking for expiring subscriptions...');
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find transactions expiring in 0-3 days
    type ExpiringTransaction = Transaction & { buyer: User; offer: Offer };
    const expiringSoon = (await this.prisma.transaction.findMany({
      where: {
        expiresAt: {
          gt: now,
          lte: in3Days,
        },
        status: 'COMPLETED',
      },
      include: { buyer: true, offer: true },
    })) as ExpiringTransaction[];

    for (const tx of expiringSoon) {
      if (tx.buyer.telegramId) {
        const diffDays = Math.ceil(
          (tx.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        const message = `⚠️ *Ваша подписка на "${tx.offer.title}" заканчивается через ${diffDays} дня!*\n\nНе забудьте продлить ее, чтобы сохранить доступ к сервису.`;

        const webAppUrl = process.env.FRONTEND_URL || 'https://perkly.uz';
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔄 Продлить сейчас',
                web_app: { url: `${webAppUrl}/offer/${tx.offerId}` },
              },
            ],
          ],
        };

        await this.sendTelegramNotification(
          tx.buyer.telegramId,
          message,
          keyboard,
        );
      }
    }
  }
}
