// scripts/compress-existing-logos.js
//
// ⚠️ KORIJE EGRESS — Script ini-fwa (idempotan) pou konprese logo tenant yo
// ki te telechaje AVAN nou te ajoute konpresyon nan wout POST /tenant/logo
// (gade tenant.routes.js). Logo sa yo rete kòm gwo imaj brit (ka rive 1MB+)
// nan `tenant.logoUrl`, e yo vwayaje nèt chak fwa `/tenant/settings` chaje
// — se egzakteman sa ki te lakòz repons 1161KB nou te wè nan log Render yo.
//
// Sèlman logo ki pi gwo pase SIZE_THRESHOLD_KB touche — yon logo ki deja
// piti (deja konprese, oswa SVG) pa touche ditou. San danje pou kouri
// plizyè fwa: yon logo ki deja anba sèy la senpleman sote.
//
// Itilizasyon (soti nan dosye `backend`):
//   node scripts/compress-existing-logos.js

const prisma = require('../src/config/prisma');
const sharp  = require('sharp');

const MAX_RETRIES       = 5;
const RETRY_DELAY       = 2000; // ms
const SIZE_THRESHOLD_KB = 60;   // logo ki anba sa a pa touche (deja piti)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ⚠️ Menm paramèt ak compressImage() nan tenant.routes.js (maxWidth 512,
// kalite 78%, WebP) — pou rezilta a konsistan ak nouvo logo yo.
async function compressLogoDataUri(dataUri, { maxWidth = 512, quality = 78 } = {}) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return null; // deja vektè, pa gen "poids" pou konprese
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const outBuffer = await sharp(inputBuffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return `data:image/webp;base64,${outBuffer.toString('base64')}`;
}

function sizeOfDataUriKB(dataUri) {
  return Buffer.byteLength(dataUri, 'utf8') / 1024;
}

async function run() {
  console.log('=== Konpresyon logo tenant ki deja egziste ===\n');

  await withRetry(() => prisma.$connect(), 'connect');

  const tenants = await withRetry(
    () => prisma.tenant.findMany({
      where: { logoUrl: { startsWith: 'data:' } },
      select: { id: true, name: true, logoUrl: true },
    }),
    'fetch tenants'
  );

  console.log(`${tenants.length} tenant(s) gen yon logo (data URI) pou verifye.\n`);

  let scanned = 0, fixed = 0, skipped = 0, errors = 0, totalSavedKB = 0;

  for (const tenant of tenants) {
    scanned++;
    const originalSizeKB = sizeOfDataUriKB(tenant.logoUrl);

    if (originalSizeKB <= SIZE_THRESHOLD_KB) {
      skipped++;
      console.log(`[sote] ${tenant.name} (${tenant.id}) — ${originalSizeKB.toFixed(1)}KB, deja piti`);
      continue;
    }

    try {
      const compressed = await compressLogoDataUri(tenant.logoUrl);
      if (!compressed) {
        skipped++;
        console.log(`[sote] ${tenant.name} (${tenant.id}) — SVG oswa fòma envalid`);
        continue;
      }

      const newSizeKB = sizeOfDataUriKB(compressed);
      if (newSizeKB >= originalSizeKB) {
        skipped++;
        console.log(`[sote] ${tenant.name} (${tenant.id}) — konpresyon pa t ede (${originalSizeKB.toFixed(1)}KB → ${newSizeKB.toFixed(1)}KB)`);
        continue;
      }

      await withRetry(
        () => prisma.tenant.update({
          where: { id: tenant.id },
          data: { logoUrl: compressed },
        }),
        `update ${tenant.id}`
      );

      const savedKB = originalSizeKB - newSizeKB;
      totalSavedKB += savedKB;
      fixed++;
      console.log(`[ok] ${tenant.name} (${tenant.id}) — ${originalSizeKB.toFixed(1)}KB → ${newSizeKB.toFixed(1)}KB (sove ${savedKB.toFixed(1)}KB)`);
    } catch (err) {
      errors++;
      console.error(`[erè] ${tenant.name} (${tenant.id}): ${err.message}`);
    }
  }

  console.log('\n=== Fini ===');
  console.log(`Total eskane: ${scanned}`);
  console.log(`Korije (konprese): ${fixed}`);
  console.log(`Sote (deja piti/SVG): ${skipped}`);
  console.log(`Erè: ${errors}`);
  console.log(`Total espas sove: ${totalSavedKB.toFixed(1)}KB`);

  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('Erè fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
