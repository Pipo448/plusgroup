// scripts/regenerate-thumbnails.js
// ─────────────────────────────────────────────────────────────────
// SCRIPT YON SÈL FWA — REJENERE thumbnailUrl pou TOUT pwodui ki deja
// genyen yon imageUrl, san okenn moun pa bezwen re-upload foto yo.
//
// Poukisa: griy pwodui yo (.pd-media nan ProductsPage.jsx) te toujou
// itilize yon thumbnailUrl ki te fèt ak ansyen chif yo (100px/60%),
// e sa te fè kat yo parèt flou. Nouvo estanda a (product.service.js)
// se 480px/75%, men li aplike SÈLMAN pou NOUVO foto/modifikasyon kap
// vini kounye a.
//
// ✅ SAN DANJE — script sa a touche SÈLMAN `thumbnailUrl`. Li pa
// janm touche `imageUrl` (gwo vèsyon an), donk pa gen okenn risk
// pèdi kalite. Li rejenere thumbnail la soti nan `imageUrl` ki DEJA
// estoke nan baz done a (kèlkeswa kalite li ye kounye a), lè l
// aplike nouvo chif yo (480px/75%) — se yon rezoud SÈLMAN (pa yon
// agrandisman), kidonk li toujou san danje menm si imageUrl sous lan
// te deja konprese nan 600px.
//
// SAN DANJE pou relanse plizyè fwa.
//
// Kouri l ak:   node scripts/regenerate-thumbnails.js
// ─────────────────────────────────────────────────────────────────

const prisma = require('../src/config/prisma'); // ⚠️ Ajiste chemen sa a si l pa matche
const sharp  = require('sharp');

const BATCH_SIZE     = 10;
const THUMB_WIDTH    = 480;  // ⚠️ menm valè ak compressThumbnailDataUri nan product.service.js
const THUMB_QUALITY  = 75;   // ⚠️ menm valè ak compressThumbnailDataUri nan product.service.js
const MAX_RETRIES    = 5;    // kantite tantativ si koneksyon Supabase tonbe
const RETRY_DELAY_MS = 2000; // tan pou tann ant tantativ yo

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Relanse yon operasyon Prisma otomatikman si koneksyon an tonbe
// (P1017 oswa nenpòt erè rezo/koneksyon), olye kite tout script la kraze.
async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isConnectionError =
        err.code === 'P1017' ||
        err.code === 'P1001' ||
        err.code === 'P1008' ||
        /closed the connection|connection.*closed|timeout/i.test(err.message || '');

      if (!isConnectionError || attempt === MAX_RETRIES) throw err;

      console.warn(
        `⚠️  Koneksyon tonbe pandan "${label}" (tantativ ${attempt}/${MAX_RETRIES}) — ` +
        `tann ${RETRY_DELAY_MS}ms epi eseye ankò...`
      );
      await sleep(RETRY_DELAY_MS);
      try { await prisma.$connect(); } catch {}
    }
  }
  throw lastErr;
}

async function makeThumbnail(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return dataUri; // deja vektè, pa gen rezon rejenere

  const inputBuffer = Buffer.from(base64Data, 'base64');
  const outBuffer = await sharp(inputBuffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  return `data:image/webp;base64,${outBuffer.toString('base64')}`;
}

async function main() {
  console.log('🔍 Chèche pwodui ki gen yon imageUrl...\n');

  let cursor       = null;
  let totalScanned = 0;
  let totalFixed   = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  while (true) {
    const products = await withRetry(
      () => prisma.product.findMany({
        where: { imageUrl: { startsWith: 'data:' } },
        select: { id: true, name: true, imageUrl: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
      'SELECT pwodui'
    );

    if (products.length === 0) break;

    for (const product of products) {
      totalScanned++;

      try {
        const thumbnailUrl = await makeThumbnail(product.imageUrl);
        if (!thumbnailUrl) { totalSkipped++; continue; }

        await withRetry(
          () => prisma.product.update({
            where: { id: product.id },
            data:  { thumbnailUrl }, // ⚠️ SÈLMAN thumbnailUrl — imageUrl pa touche
          }),
          `UPDATE thumbnail pwodui ${product.id}`
        );

        totalFixed++;
        console.log(`✅ ${product.name || product.id} — thumbnail rejenere (480px/75%)`);
      } catch (err) {
        totalErrors++;
        console.error(`❌ Erè sou pwodui ${product.id} (${product.name || '—'}):`, err.message);
      }
    }

    cursor = products[products.length - 1].id;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`📊 Total eskane:   ${totalScanned}`);
  console.log(`✅ Total rejenere: ${totalFixed}`);
  console.log(`⏭️  Total sote:     ${totalSkipped} (SVG)`);
  console.log(`❌ Total erè:      ${totalErrors}`);
  console.log('─────────────────────────────────────────\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('💥 Erè fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
