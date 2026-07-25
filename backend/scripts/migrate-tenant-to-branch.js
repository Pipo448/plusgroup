// scripts/migrate-tenant-to-branch.js
//
// Itilizasyon:
//   node scripts/migrate-tenant-to-branch.js <tenant-slug> [non-branch]              → DRY RUN
//   node scripts/migrate-tenant-to-branch.js <tenant-slug> [non-branch] --apply      → aplike vrèman
//
// Egzanp:
//   node scripts/migrate-tenant-to-branch.js plus-store
//   node scripts/migrate-tenant-to-branch.js plus-store "Plus Store" --apply
//
// ⚠️ KORIJE (apre ensidan 25 jiyè 2026) — ANSYEN vèsyon an te "adopte" yon
// branch ki te DEJA egziste kòm sib backfill si tenant lan te gen youn.
// Sa te fè done "jeneral" yon tenant (pa egzanp Plus Store) mal tache sou
// yon lòt branch ki te deja gen pwòp vrè done pa li (Plus Barber), melanje
// de biznis diferan anba menm branch_id.
//
// KOUNYE A: script la TOUJOU kreye yon NOUVO branch dedye pou done san
// branch yo, kèlkeswa si tenant lan gen deja lòt branch. Li pa janm touche
// oswa "adopte" yon branch ki egziste deja.
//
// Sa script la fè:
//   1. Jwenn tenant lan pa slug
//   2. Konte done san branch (branchId = NULL) pou chak modil — AVAN nenpòt kreyasyon
//   3. Si TOTAL la se 0 pou tout modil, pa gen anyen pou fè — sòti san kreye anyen
//   4. Sinon, kreye yon NOUVO branch dedye (non pa defo = non tenant lan,
//      oswa non ou bay kòm 2yèm agiman)
//   5. Backfill done san branch yo sou nouvo branch sa a
//   6. Montre yon rapò konte pou chak tab

const prisma = require('../src/config/prisma')

const MODELS_TO_BACKFILL = [
  { model: 'product',       label: 'Pwodui' },
  { model: 'client',        label: 'Kliyan' },
  { model: 'quote',         label: 'Devi' },
  { model: 'invoice',       label: 'Fakti' },
  { model: 'stockMovement', label: 'Mouvman Estòk' },
  { model: 'dryOrder',      label: 'Kòmand Dry (si modil aktif)' },
  { model: 'room',          label: 'Chanm Hotel (si modil aktif)' },
  { model: 'reservation',   label: 'Rezèvasyon Hotel (si modil aktif)' },
  { model: 'kaneEpay',      label: 'Kane Epay (si modil aktif)' },
  { model: 'pre',           label: 'Prè Mikwo Kredi (si modil aktif)' },
  { model: 'sabotayPlan',   label: 'Plan Sabotay (si modil aktif)' },
]

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const positional = args.filter(a => a !== '--apply')
  const slug = positional[0]
  const customBranchName = positional[1] // opsyonèl

  if (!slug) {
    console.error('❌ Itilizasyon: node scripts/migrate-tenant-to-branch.js <tenant-slug> [non-branch] [--apply]')
    process.exit(1)
  }

  console.log(`\n${apply ? '🚀 MOD APLIKASYON' : '🔍 MOD TÈS (dry run — pa gen anyen k ap chanje)'}`)
  console.log(`Tenant slug: ${slug}\n`)

  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    console.error(`❌ Tenant "${slug}" pa jwenn.`)
    process.exit(1)
  }
  console.log(`✅ Tenant jwenn: ${tenant.name} (${tenant.id})\n`)

  // ── Enfo sèlman — montre branch ki deja egziste yo, pa janm itilize yo kòm sib
  const existingBranches = await prisma.branch.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' }
  })
  if (existingBranches.length > 0) {
    console.log(`ℹ️  Tenant sa a deja gen ${existingBranches.length} branch:`)
    existingBranches.forEach(b => console.log(`     - ${b.name} (${b.slug})`))
    console.log(`   ⚠️  OKENN nan yo p ap touche oswa itilize kòm sib — nou pral kreye yon NOUVO branch separe.\n`)
  }

  // ── Etap 1: Konte done san branch AVAN nenpòt kreyasyon
  console.log('── Konte done san branch (avan kreyasyon) ──\n')
  const counts = {}
  let totalOrphans = 0

  for (const { model, label } of MODELS_TO_BACKFILL) {
    if (!prisma[model]) {
      console.log(`⏭️  ${label}: modil pa egziste nan schema a, skip.`)
      continue
    }
    try {
      const c = await prisma[model].count({ where: { tenantId: tenant.id, branchId: null } })
      counts[model] = c
      totalOrphans += c
      console.log(c > 0 ? `📋 ${label}: ${c} done san branch.` : `✅ ${label}: 0 done san branch.`)
    } catch (e) {
      console.log(`⚠️  ${label}: pa ka konte (${e.message}) — skip.`)
    }
  }

  if (totalOrphans === 0) {
    console.log(`\n✅ Pa gen okenn done san branch pou tenant sa a. Anyen pou fè — script sòti san touche anyen.\n`)
    await prisma.$disconnect()
    return
  }

  console.log(`\n📊 Total: ${totalOrphans} done san branch jwenn nan tenant sa a.\n`)

  // ── Etap 2: Kreye NOUVO branch dedye (JANM adopte youn ki egziste)
  const branchName = customBranchName || tenant.name
  let baseSlug = slugify(branchName) || 'main'
  let finalSlug = baseSlug
  let suffix = 1

  // Evite kolizyon si yon branch ak menm slug deja egziste
  while (await prisma.branch.findFirst({ where: { tenantId: tenant.id, slug: finalSlug } })) {
    suffix += 1
    finalSlug = `${baseSlug}-${suffix}`
  }

  console.log(`📦 Pral kreye NOUVO branch dedye pou done san branch yo:`)
  console.log(`   Non: "${branchName}"  ·  Slug: "${finalSlug}"  ·  isActive: true\n`)

  let newBranch = null
  if (apply) {
    newBranch = await prisma.branch.create({
      data: { tenantId: tenant.id, name: branchName, slug: finalSlug, isActive: true }
    })
    console.log(`✅ Nouvo branch kreye: ${newBranch.id}\n`)
  } else {
    console.log(`   (dry run — branch pa kreye toutbon)\n`)
  }

  // ── Etap 3: Backfill done san branch yo sou NOUVO branch la sèlman
  console.log('── Backfill pa modil ──\n')

  for (const { model, label } of MODELS_TO_BACKFILL) {
    const orphanCount = counts[model]
    if (orphanCount === undefined || orphanCount === 0) continue

    if (apply && newBranch) {
      const result = await prisma[model].updateMany({
        where: { tenantId: tenant.id, branchId: null },
        data: { branchId: newBranch.id }
      })
      console.log(`✅ ${label}: ${result.count} liy tache sou nouvo branch "${newBranch.name}".`)
    } else {
      console.log(`(dry run) ${label}: ${orphanCount} liy ta pral tache sou nouvo branch "${branchName}".`)
    }
  }

  console.log(`\n${apply ? '✅ Migrasyon fini.' : '🔍 Dry run fini — rerun ak --apply pou aplike vrèman.'}\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Erè:', e)
  await prisma.$disconnect()
  process.exit(1)
})