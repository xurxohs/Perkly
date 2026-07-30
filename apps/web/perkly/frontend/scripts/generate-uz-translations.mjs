import { readFile, writeFile } from 'node:fs/promises';

const sources = [
  'src/content/trust-pages.ts',
  'src/app/about/page.tsx',
  'src/app/how-it-works/page.tsx',
  'src/app/safety/page.tsx',
  'src/app/refunds/page.tsx',
  'src/app/seller-rules/page.tsx',
  'src/app/content-policy/page.tsx',
  'src/app/support/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/vendor/layout.tsx',
  'src/app/vendor/page.tsx',
  'src/app/vendor/products/page.tsx',
  'src/app/vendor/promocodes/page.tsx',
  'src/app/vendor/orders/page.tsx',
  'src/app/vendor/analytics/page.tsx',
  'src/app/vendor/settings/page.tsx',
];

const strings = new Set();
for (const source of sources) {
  const text = await readFile(source, 'utf8');
  for (const match of text.matchAll(/(['"])([^'"\n]*[А-Яа-яЁё][^'"\n]*)\1/g)) {
    const value = match[2].trim();
    if (value.length > 1 && !value.includes('${')) strings.add(value);
  }
}

async function translate(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'ru');
  url.searchParams.set('tl', 'uz');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Translation failed: ${response.status}`);
  const payload = await response.json();
  return payload[0].map((part) => part[0]).join('');
}

const entries = [];
const queue = [...strings];
for (let index = 0; index < queue.length; index += 8) {
  const batch = queue.slice(index, index + 8);
  const translations = await Promise.all(batch.map(translate));
  entries.push(...batch.map((source, offset) => [source, translations[offset]]));
}

const body = `// Generated baseline, reviewed and overrideable from the main UI dictionary.\nexport const PUBLIC_COPY_UZ: Record<string, string> = ${JSON.stringify(Object.fromEntries(entries), null, 2)};\n`;
await writeFile('src/content/public-copy-uz.ts', body);
console.log(`Generated ${entries.length} public translations`);
