/**
 * Intentionally empty local seed.
 *
 * Production data must be created through migrations and the authenticated
 * admin/vendor flows. Keeping this command explicit prevents `prisma db seed`
 * from deleting real records or publishing sample offers by mistake.
 */
function assertLocalSeedAllowed() {
  const isLocalRuntime = ['development', 'test'].includes(
    process.env.NODE_ENV ?? '',
  );
  const explicitlyEnabled = process.env.ALLOW_LOCAL_SEED === 'true';

  if (!isLocalRuntime || !explicitlyEnabled) {
    throw new Error(
      'Local seed is disabled. Set NODE_ENV=development and ALLOW_LOCAL_SEED=true to acknowledge an empty local seed.',
    );
  }
}

async function main() {
  assertLocalSeedAllowed();
  console.log(
    'No demo catalog records were created. Use the authenticated admin/vendor flows for local fixtures.',
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
