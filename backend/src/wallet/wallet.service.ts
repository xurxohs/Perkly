import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PKPass } from 'passkit-generator';
import { readFileSync } from 'node:fs';
import { PrismaService } from '../prisma/prisma.service';

interface WalletField {
  key: string;
  label: string;
  value: string | number;
  dateStyle?: 'PKDateStyleShort' | 'PKDateStyleMedium' | 'PKDateStyleLong';
  timeStyle?: 'PKDateStyleShort' | 'PKDateStyleMedium' | 'PKDateStyleLong';
  currencyCode?: string;
}

interface WalletPassJson {
  formatVersion: 1;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  coupon: {
    primaryFields: WalletField[];
    secondaryFields: WalletField[];
    auxiliaryFields: WalletField[];
    backFields: WalletField[];
  };
  userInfo: {
    transactionId: string;
    offerId: string;
  };
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generateTransactionPass(
    transactionId: string,
    userId: string,
  ): Promise<Buffer> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        buyer: { select: { id: true, displayName: true, email: true } },
        offer: {
          include: {
            seller: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId) {
      throw new ForbiddenException('Transaction does not belong to this user');
    }

    const certificates = this.loadCertificates();
    const pass = new PKPass(
      this.createBasePassFiles(
        this.createPassJson(
          transaction.id,
          transaction.offerId,
          transaction.offer.title,
          transaction.price,
          transaction.status,
          transaction.expiresAt,
          transaction.offer.seller.displayName ??
            transaction.offer.seller.email ??
            'Perkly seller',
          transaction.offer.usageInstructions,
          transaction.offer.latitude,
          transaction.offer.longitude,
        ),
      ),
      certificates,
    );

    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: this.transactionWalletURL(transaction.id),
      messageEncoding: 'iso-8859-1',
      altText: transaction.id.slice(0, 8).toUpperCase(),
    });

    if (transaction.expiresAt) {
      pass.setExpirationDate(transaction.expiresAt);
      pass.setRelevantDate(transaction.expiresAt);
    }

    if (transaction.offer.latitude && transaction.offer.longitude) {
      pass.setLocations({
        latitude: transaction.offer.latitude,
        longitude: transaction.offer.longitude,
        relevantText: 'Ваш Perkly-купон рядом',
      });
    }

    try {
      return pass.getAsBuffer();
    } catch (error) {
      this.logger.error('Failed to generate Apple Wallet pass', error);
      throw new ServiceUnavailableException(
        'Apple Wallet pass generation failed. Check Wallet certificates.',
      );
    }
  }

  private createPassJson(
    transactionId: string,
    offerId: string,
    offerTitle: string,
    price: number,
    status: string,
    expiresAt: Date | null,
    sellerName: string,
    usageInstructions: string | null,
    latitude: number | null,
    longitude: number | null,
  ): WalletPassJson {
    const auxiliaryFields: WalletField[] = [
      {
        key: 'seller',
        label: 'Продавец',
        value: sellerName,
      },
    ];

    if (expiresAt) {
      auxiliaryFields.push({
        key: 'expires',
        label: 'Действует до',
        value: expiresAt.toISOString(),
        dateStyle: 'PKDateStyleMedium',
        timeStyle: 'PKDateStyleShort',
      });
    }

    const backFields: WalletField[] = [
      {
        key: 'transaction',
        label: 'Transaction ID',
        value: transactionId,
      },
      {
        key: 'instructions',
        label: 'Инструкция',
        value: usageInstructions || 'Откройте Perkly для деталей заказа.',
      },
    ];

    if (latitude && longitude) {
      backFields.push({
        key: 'location',
        label: 'Локация',
        value: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      });
    }

    return {
      formatVersion: 1,
      passTypeIdentifier: this.requiredConfig('APPLE_WALLET_PASS_TYPE_ID'),
      serialNumber: transactionId,
      teamIdentifier: this.requiredConfig('APPLE_WALLET_TEAM_ID'),
      organizationName:
        this.config.get<string>('APPLE_WALLET_ORGANIZATION_NAME') ?? 'Perkly',
      description: `${offerTitle} в Perkly`,
      logoText: 'Perkly',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(18, 16, 26)',
      labelColor: 'rgb(196, 188, 210)',
      coupon: {
        primaryFields: [
          {
            key: 'offer',
            label: 'Оффер',
            value: offerTitle,
          },
        ],
        secondaryFields: [
          {
            key: 'price',
            label: 'Цена',
            value: price,
            currencyCode: 'USD',
          },
          {
            key: 'status',
            label: 'Статус',
            value: status,
          },
        ],
        auxiliaryFields,
        backFields,
      },
      userInfo: {
        transactionId,
        offerId,
      },
    };
  }

  private createBasePassFiles(
    passJson: WalletPassJson,
  ): Record<string, Buffer> {
    const icon = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    );

    return {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': icon,
      'icon@2x.png': icon,
      'logo.png': icon,
      'logo@2x.png': icon,
    };
  }

  private loadCertificates() {
    const signerCertPath = this.requiredConfig('APPLE_WALLET_CERT_PATH');
    const signerKeyPath = this.requiredConfig('APPLE_WALLET_KEY_PATH');
    const wwdrPath = this.requiredConfig('APPLE_WALLET_WWDR_CERT_PATH');

    try {
      return {
        signerCert: readFileSync(signerCertPath),
        signerKey: readFileSync(signerKeyPath),
        wwdr: readFileSync(wwdrPath),
        signerKeyPassphrase:
          this.config.get<string>('APPLE_WALLET_KEY_PASSPHRASE') || undefined,
      };
    } catch (error) {
      this.logger.warn(`Apple Wallet certificates unavailable: ${error}`);
      throw new ServiceUnavailableException(
        'Apple Wallet certificates are not configured on this server.',
      );
    }
  }

  private requiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(
        `Apple Wallet is not configured: missing ${key}.`,
      );
    }
    return value;
  }

  private transactionWalletURL(transactionId: string): string {
    const baseURL =
      this.config.get<string>('FRONTEND_URL') ?? 'https://perkly.uz';
    return `${baseURL.replace(/\/$/, '')}/wallet/transactions/${transactionId}`;
  }
}
