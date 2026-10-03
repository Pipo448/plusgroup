// scripts/compress-existing-images.js
// ─────────────────────────────────────────────────────────────────
// SCRIPT YON SÈL FWA — konprese TOUT imaj pwodui ki DEJA egziste nan
// baz done a (tout tenant). Sèvi ak menm teknik (sharp + WebP) ki
// kounye a aplike otomatikman pou NOUVO pwodui/modifikasyon nan
// product.service.js — men fwa sa a pou done ki DEJA la yo.
//
// ⚠️ KORIJE — ajoute retry otomatik sou erè koneksyon (P1017 "Server
// has closed the connection"). Supabase/pgbouncer fèmen koneksyon ki
// rete "poze" twò lontan, e konpresyon sharp sou gwo imaj ka pran
// kèk segond — ase pou koneksyon an tonbe ant rekèt yo. Kounye a chak
// rekèt Prisma (SELECT ak UPDATE) eseye ankò otomatikman si sa rive.
//
// SAN DANJE pou relanse plizyè fwa: li SOTE pwodui ki imaj yo deja
// piti (< SKIP_THRESHOLD_KB) — donk yon pwodui ki deja konprese pa
// pral re-trete.
//
// Kouri l ak:   node scripts/compress-existing-images.js
// ─────────────────────────────────────────────────────────────────

const prisma = require('../src/config/prisma'); // ⚠️ Ajiste chemen sa a si l pa matche
const sharp  = require('sharp');

const BATCH_SIZE        = 10;   // ✅ REDWI (te 25) — mwens tan ant rekèt yo
const SKIP_THRESHOLD_KB = 60;   // si imaj la deja pi piti pase sa, sote l
const MAX_WIDTH         = 600;  // menm valè ak product.service.js
const QUALITY           = 75;   // menm valè ak product.service.js
const MAX_RETRIES       = 5;    // ✅ NOUVO — kantite tantativ si koneksyon tonbe
const RETRY_DELAY_MS    = 2000; // ✅ NOUVO — tan pou tann ant tantativ yo

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ NOUVO — relanse yon operasyon Prisma otomatikman si koneksyon an tonbe
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
      // ✅ Fòse Prisma rekonekte anvan pwochen tantativ la
      try { await prisma.$connect(); } catch {}
    }
  }
  throw lastErr;
}

async function compressImageDataUri(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return null; // pa touche SVG — deja vektè

  const inputBuffer = Buffer.from(base64Data, 'base64');
  const outBuffer = await sharp(inputBuffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  return {
    newDataUri: `data:image/webp;base64,${outBuffer.toString('base64')}`,
    originalBytes: inputBuffer.length,
    compressedBytes: outBuffer.length,
  };
}

async function main() {
  console.log('🔍 Chèche pwodui ki gen yon imaj base64...\n');

  let cursor       = null;
  let totalScanned = 0;
  let totalSkipped = 0;
  let totalFixed   = 0;
  let totalErrors  = 0;
  let bytesBefore  = 0;
  let bytesAfter   = 0;

  while (true) {
    const products = await withRetry(
      () => prisma.product.findMany({
        where: {
          imageUrl: { startsWith: 'data:' },
        },
        select: { id: true, name: true, tenantId: true, imageUrl: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
      'SELECT pwodui'
    );

    if (products.length === 0) break;

    for (const product of products) {
      totalScanned++;
      const approxKb = (product.imageUrl.length * 0.75) / 1024; // base64 → bytes apwoksimatif

      if (approxKb < SKIP_THRESHOLD_KB) {
        totalSkipped++;
        continue;
      }

      try {
        const result = await compressImageDataUri(product.imageUrl);
        if (!result) { totalSkipped++; continue; }

        const { newDataUri, originalBytes, compressedBytes } = result;

        // ✅ Filè sekirite — si pou yon rezon konpresyon pa bay pi piti, pa touche done a
        if (compressedBytes >= originalBytes) {
          totalSkipped++;
          continue;
        }

        await withRetry(
          () => prisma.product.update({
            where: { id: product.id },
            data:  { imageUrl: newDataUri },
          }),
          `UPDATE pwodui ${product.id}`
        );

        bytesBefore += originalBytes;
        bytesAfter  += compressedBytes;
        totalFixed++;

        console.log(
          `✅ ${product.name || product.id} — ${kb(originalBytes)}KB → ${kb(compressedBytes)}KB`
        );
      } catch (err) {
        totalErrors++;
        console.error(`❌ Erè sou pwodui ${product.id} (${product.name || '—'}):`, err.message);
      }
    }

    cursor = products[products.length - 1].id;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`📊 Total eskane:     ${totalScanned}`);
  console.log(`✅ Total korije:     ${totalFixed}`);
  console.log(`⏭️  Total sote:       ${totalSkipped} (deja piti oswa SVG)`);
  console.log(`❌ Total erè:        ${totalErrors}`);
  if (totalFixed > 0) {
    console.log(`💾 Egress sove:      ${kb(bytesBefore - bytesAfter)}KB (${kb(bytesBefore)}KB → ${kb(bytesAfter)}KB)`);
  }
  console.log('─────────────────────────────────────────\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('💥 Erè fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});