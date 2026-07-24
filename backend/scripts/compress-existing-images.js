// backend/scripts/compress-existing-images.js
// ─── Konprese ANSYEN foto ki deja estoke kòm base64 ─────────────
// Script sa a lanse YON SÈL FWA (pa yon rout API, pa yon travay ki
// repete) pou l pase sou tout Pwodui ak Atik Devi Dirèk ki gen yon
// foto DEJA estoke, epi l konprese yo menm jan nouvo foto yo konprese
// kounye a (max 800px lajè, ~75% kalite JPEG).
//
// ⚠️ IMPÒTAN — Fè yon SAUVEGARD baz done a anvan w lanse script sa a.
// Li MODIFYE done ki deja la, aksyon an pa ka anile fasil apre.
//
// Kijan pou lanse l (nan dosye backend):
//   node scripts/compress-existing-images.js
//
// Sa mande pakè "sharp" (tretman imaj sèvè, pi rapid/fyab pase canvas
// navigatè a). Si l poko enstale:
//   npm install sharp --save

const prisma = require('../src/config/prisma');
const sharp = require('sharp');

const MAX_WIDTH = 800;
const JPEG_QUALITY = 75;

// ── Konprese yon sèl base64 data URL, retounen nouvo a (oswa null si erè)
async function compressBase64Image(dataUrl, label) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;

  try {
    const base64Payload = dataUrl.split(',')[1];
    if (!base64Payload) return null;

    const inputBuffer = Buffer.from(base64Payload, 'base64');
    const originalSizeKb = Math.round(inputBuffer.length / 1024);

    // Si li deja piti (mwens pase 60KB), pa gen bezwen konprese l ankò
    if (originalSizeKb < 60) {
      console.log(`  ⏭️  ${label} — deja piti (${originalSizeKb}KB), sote l`);
      return null;
    }

    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const newSizeKb = Math.round(outputBuffer.length / 1024);
    const savedPct = Math.round((1 - outputBuffer.length / inputBuffer.length) * 100);

    console.log(`  ✅ ${label} — ${originalSizeKb}KB → ${newSizeKb}KB (${savedPct}% ekonomize)`);

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error(`  ❌ ${label} — erè:`, err.message);
    return null;
  }
}

async function compressProducts() {
  console.log('\n📦 Pwodui yo...');
  const products = await prisma.product.findMany({
    where: { imageUrl: { startsWith: 'data:image' } },
    select: { id: true, name: true, imageUrl: true },
  });

  console.log(`Jwenn ${products.length} pwodui ak foto pou tcheke.`);

  let updated = 0;
  for (const p of products) {
    const compressed = await compressBase64Image(p.imageUrl, p.name);
    if (compressed) {
      await prisma.product.update({ where: { id: p.id }, data: { imageUrl: compressed } });
      updated++;
    }
  }
  console.log(`📦 ${updated}/${products.length} pwodui konprese.`);
}

async function compressDirectQuoteItems() {
  console.log('\n🔖 Atik Devi Dirèk yo...');
  const items = await prisma.directQuoteItem.findMany({
    where: { imageUrl: { startsWith: 'data:image' } },
    select: { id: true, description: true, imageUrl: true },
  });

  console.log(`Jwenn ${items.length} atik ak foto pou tcheke.`);

  let updated = 0;
  for (const it of items) {
    const compressed = await compressBase64Image(it.imageUrl, it.description);
    if (compressed) {
      await prisma.directQuoteItem.update({ where: { id: it.id }, data: { imageUrl: compressed } });
      updated++;
    }
  }
  console.log(`🔖 ${updated}/${items.length} atik konprese.`);
}

async function main() {
  console.log('🗜️  Konprese ansyen foto yo — kòmanse...\n');
  const startedAt = Date.now();

  await compressProducts();
  await compressDirectQuoteItems();

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n🎉 Fini an ${elapsed}s.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('💥 Erè jeneral:', err);
  await prisma.$disconnect();
  process.exit(1);
});