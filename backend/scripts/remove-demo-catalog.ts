import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DEMO_CATALOG !== 'true')
    throw new Error('Set ALLOW_DEMO_CATALOG=true explicitly.');
  const removed = await prisma.offer.deleteMany({ where: { isDemo: true } });
  console.log(`Removed ${removed.count} demo offers.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
