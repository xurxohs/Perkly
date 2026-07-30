#!/usr/bin/env node

require('dotenv/config');

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_SQLITE_PATH = path.resolve(__dirname, '..', 'prisma', 'dev.db');

const TABLES = [
  {
    table: 'Squad',
    delegate: 'squad',
    fields: [
      'id',
      'name',
      'inviteCode',
      'monthlyGoal',
      'rewardTriggeredDate',
      'createdAt',
    ],
    dateFields: ['rewardTriggeredDate', 'createdAt'],
    booleanFields: [],
  },
  {
    table: 'User',
    delegate: 'user',
    fields: [
      'id',
      'email',
      'passwordHash',
      'displayName',
      'avatarUrl',
      'role',
      'tier',
      'balance',
      'rewardPoints',
      'createdAt',
      'updatedAt',
      'telegramId',
      'phone',
      'squadId',
      'hasSquadReward',
    ],
    dateFields: ['createdAt', 'updatedAt'],
    booleanFields: ['hasSquadReward'],
  },
  {
    table: 'Offer',
    delegate: 'offer',
    fields: [
      'id',
      'title',
      'description',
      'price',
      'discountPercent',
      'vendorLogo',
      'usageInstructions',
      'category',
      'isExclusive',
      'hiddenData',
      'isActive',
      'isFlashDrop',
      'expiresAt',
      'periodDays',
      'latitude',
      'longitude',
      'sellerId',
      'featuredUntil',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['expiresAt', 'featuredUntil', 'createdAt', 'updatedAt'],
    booleanFields: ['isExclusive', 'isActive', 'isFlashDrop'],
  },
  {
    table: 'Event',
    delegate: 'event',
    fields: [
      'id',
      'title',
      'category',
      'description',
      'fullDescription',
      'date',
      'startTime',
      'ageLimit',
      'location',
      'address',
      'latitude',
      'longitude',
      'imageUrl',
      'viewersCount',
      'participantsCount',
      'organizerId',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['date', 'createdAt', 'updatedAt'],
    booleanFields: [],
  },
  {
    table: 'TopkaPost',
    delegate: 'topkaPost',
    fields: [
      'id',
      'postType',
      'status',
      'title',
      'subtitle',
      'description',
      'fullDescription',
      'category',
      'tags',
      'badges',
      'date',
      'startTime',
      'endTime',
      'location',
      'address',
      'latitude',
      'longitude',
      'priceText',
      'ctaText',
      'ctaUrl',
      'priority',
      'isFeatured',
      'publishAt',
      'expiresAt',
      'originalUrl',
      'poster3x4Url',
      'story9x16Url',
      'square1x1Url',
      'preview16x9Url',
      'dominantColor',
      'fallbackGradient',
      'createdBy',
      'updatedBy',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['date', 'publishAt', 'expiresAt', 'createdAt', 'updatedAt'],
    booleanFields: ['isFeatured'],
  },
  {
    table: 'Deposit',
    delegate: 'deposit',
    fields: [
      'id',
      'userId',
      'amount',
      'currency',
      'provider',
      'status',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['createdAt', 'updatedAt'],
    booleanFields: [],
  },
  {
    table: 'Subscription',
    delegate: 'subscription',
    fields: ['id', 'userId', 'tier', 'startDate', 'endDate', 'isActive'],
    dateFields: ['startDate', 'endDate'],
    booleanFields: ['isActive'],
  },
  {
    table: 'Transaction',
    delegate: 'transaction',
    fields: [
      'id',
      'offerId',
      'buyerId',
      'price',
      'status',
      'expiresAt',
      'isGift',
      'giftCode',
      'isRedeemed',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['expiresAt', 'createdAt', 'updatedAt'],
    booleanFields: ['isGift', 'isRedeemed'],
  },
  {
    table: 'Review',
    delegate: 'review',
    fields: [
      'id',
      'rating',
      'comment',
      'offerId',
      'authorId',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['createdAt', 'updatedAt'],
    booleanFields: [],
  },
  {
    table: 'Dispute',
    delegate: 'dispute',
    fields: [
      'id',
      'transactionId',
      'reason',
      'status',
      'createdAt',
      'updatedAt',
    ],
    dateFields: ['createdAt', 'updatedAt'],
    booleanFields: [],
  },
  {
    table: 'ChatRoom',
    delegate: 'chatRoom',
    fields: ['id', 'type', 'transactionId', 'createdAt', 'updatedAt'],
    dateFields: ['createdAt', 'updatedAt'],
    booleanFields: [],
  },
  {
    table: 'Message',
    delegate: 'message',
    fields: ['id', 'content', 'roomId', 'senderId', 'isRead', 'createdAt'],
    dateFields: ['createdAt'],
    booleanFields: ['isRead'],
  },
  {
    table: 'AdminLog',
    delegate: 'adminLog',
    fields: ['id', 'adminId', 'action', 'targetId', 'details', 'createdAt'],
    dateFields: ['createdAt'],
    booleanFields: [],
  },
  {
    table: 'AnalyticsEvent',
    delegate: 'analyticsEvent',
    fields: [
      'id',
      'eventType',
      'userId',
      'sessionId',
      'offerId',
      'metadata',
      'createdAt',
    ],
    dateFields: ['createdAt'],
    booleanFields: [],
  },
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertPostgresDatabaseUrl();
  assertSqliteExists(options.source);

  const db = new Database(options.source, {
    fileMustExist: true,
    readonly: true,
  });

  try {
    const sourceTables = getSourceTables(db);

    console.log(`Source SQLite: ${options.source}`);
    console.log(
      `Target PostgreSQL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`,
    );
    if (options.dryRun) {
      console.log('Dry run: no data will be written.');
    }

    for (const table of TABLES) {
      if (!sourceTables.has(table.table)) {
        console.log(`${table.table}: skipped, table not found in SQLite`);
        continue;
      }

      const rows = readRows(db, table.table);
      const data = rows.map((row) => normalizeRow(table, row));
      const inserted = await insertModelRows(table, data, options);

      console.log(`${table.table}: read ${rows.length}, inserted ${inserted}`);
    }

    if (sourceTables.has('_ChatParticipants')) {
      const participants = readRows(db, '_ChatParticipants').map((row) => ({
        A: row.A,
        B: row.B,
      }));
      const inserted = await insertChatParticipants(participants, options);
      console.log(
        `_ChatParticipants: read ${participants.length}, inserted ${inserted}`,
      );
    }

    console.log('Migration finished.');
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

function parseArgs(args) {
  const options = {
    source: process.env.SQLITE_DATABASE_PATH || DEFAULT_SQLITE_PATH,
    dryRun: false,
    batchSize: 500,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--source' || arg === '-s') {
      options.source = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length);
      continue;
    }

    if (arg === '--batch-size') {
      options.batchSize = Number(requireValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith('--batch-size=')) {
      options.batchSize = Number(arg.slice('--batch-size='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }

  options.source = path.resolve(process.cwd(), options.source);

  return options;
}

function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`
Usage:
  npm run migrate:data -- [options]

Options:
  -s, --source <path>       SQLite database path (default: prisma/dev.db)
      --dry-run             Read and report rows without writing to Postgres
      --batch-size <number> Insert batch size (default: 500)

Environment:
  DATABASE_URL              PostgreSQL connection string for Prisma
  SQLITE_DATABASE_PATH      Optional default source path override
`);
}

function assertPostgresDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required and must point to PostgreSQL.');
  }

  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }
}

function assertSqliteExists(source) {
  if (!fs.existsSync(source)) {
    throw new Error(`SQLite database not found: ${source}`);
  }
}

function getSourceTables(db) {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .all();

  return new Set(rows.map((row) => row.name));
}

function readRows(db, tableName) {
  return db.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all();
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeRow(table, row) {
  const dateFields = new Set(table.dateFields);
  const booleanFields = new Set(table.booleanFields);
  const data = {};

  for (const field of table.fields) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) continue;

    const value = row[field];

    if (dateFields.has(field)) {
      data[field] = toDate(value, table.table, field);
      continue;
    }

    if (booleanFields.has(field)) {
      data[field] = toBoolean(value);
      continue;
    }

    data[field] = value;
  }

  return data;
}

function toDate(value, table, field) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;

  const numericValue =
    typeof value === 'number' || /^\d+$/.test(String(value))
      ? Number(value)
      : null;

  const date =
    numericValue === null
      ? new Date(value)
      : new Date(
          numericValue < 100000000000 ? numericValue * 1000 : numericValue,
        );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid DateTime in ${table}.${field}: ${value}`);
  }

  return date;
}

function toBoolean(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;

  return Boolean(value);
}

async function insertModelRows(table, rows, options) {
  if (rows.length === 0 || options.dryRun) {
    return 0;
  }

  const model = prisma[table.delegate];
  let inserted = 0;

  for (const chunk of chunks(rows, options.batchSize)) {
    const result = await model.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += result.count;
  }

  return inserted;
}

async function insertChatParticipants(rows, options) {
  if (rows.length === 0 || options.dryRun) {
    return 0;
  }

  let inserted = 0;

  for (const chunk of chunks(rows, options.batchSize)) {
    const placeholders = [];
    const values = [];

    chunk.forEach((row, index) => {
      const start = index * 2;
      placeholders.push(`($${start + 1}, $${start + 2})`);
      values.push(row.A, row.B);
    });

    const query = `
      INSERT INTO "_ChatParticipants" ("A", "B")
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    inserted += await prisma.$executeRawUnsafe(query, ...values);
  }

  return inserted;
}

function chunks(items, size) {
  const result = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function maskDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
