// scripts/generate-product-thumbnails.js
//
// ⚠️ KORIJE EGRESS — Script ini-fwa (idempotan) pou kreye `thumbnailUrl`
// pou TOUT pwodui ki deja egziste yo ki gen yon `imageUrl` (gwo, deja
// konprese) men ki poko gen `thumbnailUrl`. Apre sa, lis/griy pwodui yo
// (`GET /products`) ap sèvi ak ti thumbnail la olye gwo imaj la, menm pou
// pwodui ki te kreye AVAN chanjman `product.service.js` la.
//
// San danje pou fè kouri plizyè fwa: nenpòt pwodui ki deja gen yon
// `thumbnailUrl` pa touche ditou — w ka rete l (Ctrl+C) epi relanse l
// pita, li ap kontinye kote l te rete a.
//
// Itilizasyon (soti nan dosye `backend`):
//   node scripts/generate-product-thumbnails.js

const prisma = require('../src/config/prisma');
const sharp  = require('sharp');

const BATCH_SIZE   = 10;
const MAX_RETRIES  = 5;
const RETRY_DELAY  = 2000; // ms

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ⚠️ Script CPU-entansif (sharp) ka fè koneksyon pooler Supabase a (pgbouncer)
// tonbe (erè P1017). withRetry() re-eseye otomatikman san kraze tout script la.
async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`[retry] ${label} — eseye ${attempt}/${MAX_RETRIES} echwe: ${err.message}`);
      try { await prisma.$disconnect(); } catch (_) {}
      await sleep(RETRY_DELAY);
      try { await prisma.$connect(); } catch (_) {}
    }
  }
  throw lastErr;
}

async function compressThumbnailDataUri(dataUri, { maxWidth = 100, quality = 60 } = {}) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return null; // deja vektè/piti, pa vo lapenn
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const outBuffer = await sharp(inputBuffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return `data:image/webp;base64,${outBuffer.toString('base64')}`;
}

async function run() {
  console.log('=== Kreyasyon thumbnail pou pwodui ki deja egziste ===\n');

  await withRetry(() => prisma.$connect(), 'connect');

  let scanned = 0, fixed = 0, skipped = 0, errors = 0;
  let cursor = null;

  while (true) {
    const products = await withRetry(
      () => prisma.product.findMany({
        where: {
          imageUrl:     { startsWith: 'data:' },
          thumbnailUrl: null,
        },
        select: { id: true, name: true, imageUrl: true },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      }),
      'fetch batch'
    );

    if (products.length === 0) break;

    for (const product of products) {
      scanned++;
      cursor = product.id;
      try {
        const thumbnailUrl = await compressThumbnailDataUri(product.imageUrl);
        if (!thumbnailUrl) {
          skipped++;
          console.log(`[skip] ${product.name} (${product.id}) — SVG oswa imaj envalid`);
          continue;
        }
        await withRetry(
          () => prisma.product.update({
            where: { id: product.id },
            data: { thumbnailUrl },
          }),
          `update ${product.id}`
        );
        fixed++;
        console.log(`[ok] ${product.name} (${product.id}) — thumbnail kreye`);
      } catch (err) {
        errors++;
        console.error(`[erè] ${product.name} (${product.id}): ${err.message}`);
      }
    }

    console.log(`--- pwogrè: ${scanned} eskane, ${fixed} korije, ${skipped} sote, ${errors} erè ---\n`);
  }

  console.log('\n=== Fini ===');
  console.log(`Total eskane: ${scanned}`);
  console.log(`Korije (thumbnail kreye): ${fixed}`);
  console.log(`Sote (SVG/envalid): ${skipped}`);
  console.log(`Erè: ${errors}`);

  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('Erè fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
