// backend/scripts/compress-existing-images.js
// ─── Konprese ANSYEN foto ki deja estoke kòm base64 ─────────────
// Script sa a lanse YON SÈL FWA (pa yon rout API, pa yon travay ki
// repete) pou l pase sou: Logo Tenant, Foto Kanè Epay, Pwodui, ak Atik
// Devi Dirèk ki gen yon foto DEJA estoke, epi l konprese yo (max 800px
// lajè pou pwodui/atik/foto Kanè Epay, max 200px pou logo, ~75% kalite
// JPEG).
//
// ⚠️ IMPÒTAN — Fè yon SAUVEGARD baz done a anvan w lanse script sa a.
// Li MODIFYE done ki deja la, aksyon an pa ka anile fasil apre.
//
// Kijan pou lanse l (nan dosye backend):
//   node scripts/compress-existing-images.js --dry-run           ← montre rezilta a, pa touche BD
//   node scripts/compress-existing-images.js --dry-run --only=tenants
//   node scripts/compress-existing-images.js --only=tenants        ← aplike pou vre, sèlman tenants
//   node scripts/compress-existing-images.js                       ← aplike pou vre, tout kategori
//
// --only ka pran: tenants | kane | products | quotes
//
// Sa mande pakè "sharp" (tretman imaj sèvè, pi rapid/fyab pase canvas
// navigatè a). Si l poko enstale:
//   npm install sharp --save

const prisma = require('../src/config/prisma');
const sharp = require('sharp');

const MAX_WIDTH = 800;
const JPEG_QUALITY = 75;

// ⭐ AJOUTE — --dry-run montre rezilta a SAN modifye baz done a.
// --only=tenants | products | quotes | kane pou fè yo youn pa youn.
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (() => {
  const arg = process.argv.find(a => a.startsWith('--only='));
  return arg ? arg.split('=')[1] : null;
})();

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

  // ⚠️ KORIJE — menm pwoblèm ak kane_epay: 513 pwodui ak imaj an menm
  // kou (~140KB mwayèn = 70+ MB total) lakòz koneksyon an lage (P1017).
  // Chaje id+non yo dabò (leje), epi rale imaj la youn pa youn.
  const productRefs = await prisma.product.findMany({
    where: { imageUrl: { startsWith: 'data:image' } },
    select: { id: true, name: true },
  });

  console.log(`Jwenn ${productRefs.length} pwodui ak foto pou tcheke.`);

  let updated = 0;
  for (const ref of productRefs) {
    const p = await prisma.product.findUnique({ where: { id: ref.id }, select: { imageUrl: true } });
    const compressed = await compressBase64Image(p.imageUrl, ref.name);
    if (compressed) {
      if (!DRY_RUN) await prisma.product.update({ where: { id: ref.id }, data: { imageUrl: compressed } });
      updated++;
    }
  }
  console.log(`📦 ${updated}/${productRefs.length} pwodui konprese.`);
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
      if (!DRY_RUN) await prisma.directQuoteItem.update({ where: { id: it.id }, data: { imageUrl: compressed } });
      updated++;
    }
  }
  console.log(`🔖 ${updated}/${items.length} atik konprese.`);
}

// ⭐ AJOUTE — Logo tenant yo (tenants.logo_url). Pi piti (max 200px) paske
// se yon logo, pa yon foto pwodui — pa bezwen gwo rezolisyon.
async function compressTenantLogos() {
  console.log('\n🏢 Logo Tenant yo...');
  const tenants = await prisma.tenant.findMany({
    where: { logoUrl: { startsWith: 'data:image' } },
    select: { id: true, slug: true, logoUrl: true },
  });

  console.log(`Jwenn ${tenants.length} tenant ak logo pou tcheke.`);

  let updated = 0;
  for (const t of tenants) {
    const compressed = await compressLogoImage(t.logoUrl, t.slug);
    if (compressed) {
      if (!DRY_RUN) await prisma.tenant.update({ where: { id: t.id }, data: { logoUrl: compressed } });
      updated++;
    }
  }
  console.log(`🏢 ${updated}/${tenants.length} logo tenant konprese.`);
}

// ⭐ AJOUTE — Foto Kanè Epay (kane_epay_accounts.photo_url ak id_photo_url).
// Sa a se PI GWO sous egress la kounye a (foto rive 7.5 MB chak, san
// konprese, pran dirèkteman soti nan kamera telefòn nan).
async function compressKaneEpayPhotos() {
  console.log('\n🪪 Foto Kanè Epay yo...');

  // ⚠️ KORIJE — Foto sa yo ka rive 7.5 MB chak. Chaje TOUT kont yo an
  // menm kou (ak foto ladan yo) nan yon sèl findMany() lakòz konneksyon
  // Postgres/PgBouncer lan lage (P1017 "server has closed the
  // connection") paske li twò gwo. Kounye a nou chaje SÈLMAN id+non yo
  // dabò (leje), epi nou chaje FOTO a youn pa youn (yon rekèt separe pou
  // chak kont) — chak rekèt rete piti e koneksyon an pa gen tan lage.
  const accountRefs = await prisma.kaneEpay.findMany({
    where: {
      OR: [
        { photoUrl:   { startsWith: 'data:image' } },
        { idPhotoUrl: { startsWith: 'data:image' } },
      ],
    },
    select: { id: true, accountNumber: true },
  });

  console.log(`Jwenn ${accountRefs.length} kont ak foto pou tcheke.`);

  let updated = 0;
  for (const ref of accountRefs) {
    // Rale FOTO sa a apa — yon sèl kont a la fwa, pa tout 12 an menm kou.
    const acc = await prisma.kaneEpay.findUnique({
      where: { id: ref.id },
      select: { photoUrl: true, idPhotoUrl: true },
    });

    const data = {};
    const photoCompressed = await compressBase64Image(acc.photoUrl, `${ref.accountNumber} (foto)`);
    if (photoCompressed) data.photoUrl = photoCompressed;

    const idPhotoCompressed = await compressBase64Image(acc.idPhotoUrl, `${ref.accountNumber} (id_photo)`);
    if (idPhotoCompressed) data.idPhotoUrl = idPhotoCompressed;

    if (Object.keys(data).length) {
      if (!DRY_RUN) await prisma.kaneEpay.update({ where: { id: ref.id }, data });
      updated++;
    }
  }
  console.log(`🪪 ${updated}/${accountRefs.length} kont Kanè Epay konprese.`);
}

// Logo — vèsyon pi piti (200px) menm modèl ak compressBase64Image, men
// san sote sou "deja piti < 60KB" (yon logo 60KB toujou vo konprese).
async function compressLogoImage(dataUrl, label) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  try {
    const base64Payload = dataUrl.split(',')[1];
    if (!base64Payload) return null;
    const inputBuffer = Buffer.from(base64Payload, 'base64');
    const originalSizeKb = Math.round(inputBuffer.length / 1024);

    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: 200, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    if (outputBuffer.length >= inputBuffer.length) return null; // pa gen benefis

    const newSizeKb = Math.round(outputBuffer.length / 1024);
    const savedPct = Math.round((1 - outputBuffer.length / inputBuffer.length) * 100);
    console.log(`  ✅ ${label} — ${originalSizeKb}KB → ${newSizeKb}KB (${savedPct}% ekonomize)`);

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error(`  ❌ ${label} — erè:`, err.message);
    return null;
  }
}

async function main() {
  console.log(DRY_RUN ? '🔍 MOD TÈS (--dry-run) — anyen p ap sove nan baz done a.\n' : '⚠️  MOD REYÈL — chanjman yo AP sove nan baz done a.\n');
  if (ONLY) console.log(`👉 Sèlman: ${ONLY}\n`);
  console.log('🗜️  Konprese ansyen foto yo — kòmanse...\n');
  const startedAt = Date.now();

  if (!ONLY || ONLY === 'tenants')  await compressTenantLogos();
  if (!ONLY || ONLY === 'kane')     await compressKaneEpayPhotos();
  if (!ONLY || ONLY === 'products') await compressProducts();
  if (!ONLY || ONLY === 'quotes')   await compressDirectQuoteItems();

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n🎉 Fini an ${elapsed}s.${DRY_RUN ? ' (Dry run — okenn chanjman pa fèt.)' : ''}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('💥 Erè jeneral:', err);
  await prisma.$disconnect();
  process.exit(1);
});