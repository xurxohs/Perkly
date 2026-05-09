const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const sqliteDb = new Database(path.join(__dirname, '../prisma/dev.db'));
const prisma = new PrismaClient();

// Order is important for foreign keys
const tables = [
    'User',
    'Admin',
    'Squad',
    'SquadMember',
    'Event',
    'Offer',
    'ChatRoom',
    'Message',
    'Transaction',
    'CartItem',
    'Deposit',
    'Subscription',
    'TopkaPost',
    'DeviceToken',
    'AnalyticsEvent',
    'AdminLog'
];

// Helper to convert SQLite 0/1 to boolean where necessary
function sanitizeRow(row) {
    const sanitized = { ...row };
    for (const key in sanitized) {
        if (sanitized[key] === null) continue;
        
        // SQLite doesn't have true booleans, they are stored as 1/0
        // We need to guess booleans or just pass them if Prisma coerces.
        // Prisma createMany is strict, so we should map known boolean fields:
        const boolFields = ['isActive', 'isFlashDrop', 'isSystem', 'isRead', 'isFeatured', 'hidden', 'isGift', 'isRedeemed'];
        if (boolFields.includes(key) && (sanitized[key] === 0 || sanitized[key] === 1)) {
            sanitized[key] = sanitized[key] === 1;
        }

        const dateFields = ['createdAt', 'updatedAt', 'expiresAt', 'date', 'publishAt'];
        if (dateFields.includes(key) && typeof sanitized[key] === 'number') {
            sanitized[key] = new Date(sanitized[key]);
        }
        if (dateFields.includes(key) && typeof sanitized[key] === 'string') {
            sanitized[key] = new Date(sanitized[key]);
        }
    }
    return sanitized;
}

async function main() {
    console.log('Starting migration from SQLite to PostgreSQL...');

    for (const table of tables) {
        console.log(`Migrating table: ${table}...`);
        
        try {
            const rows = sqliteDb.prepare(`SELECT * FROM "${table}"`).all();
            console.log(`  Found ${rows.length} rows in SQLite.`);

            if (rows.length === 0) continue;

            const sanitizedRows = rows.map(sanitizeRow);

            const chunkSize = 100;
            for (let i = 0; i < sanitizedRows.length; i += chunkSize) {
                const chunk = sanitizedRows.slice(i, i + chunkSize);
                await prisma[table[0].toLowerCase() + table.slice(1)].createMany({
                    data: chunk,
                    skipDuplicates: true
                });
            }
            
            console.log(`  Successfully migrated ${rows.length} rows for ${table}.`);
        } catch (err) {
            // Sometimes table doesn't exist in old DB, ignore
            if (err.message.includes('no such table')) {
                console.log(`  Table ${table} does not exist in SQLite. Skipping.`);
            } else {
                console.error(`  Error migrating ${table}:`, err.message);
            }
        }
    }

    console.log('Migration completed!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
