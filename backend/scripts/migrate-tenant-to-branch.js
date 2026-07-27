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
// ⚠️ SAN DANJE POU RE-KOURI sou yon tenant ki DEJA migre (pa egzanp
// plus-store, hme) — si tenant lan gen deja yon branch e pa gen okenn
// done san branch ankò, script la sote etap kreyasyon/backfill done a,
// men li KONTINYE rive nan ETAP 4 (lye kesye) pou l ka repare kesye ki
// te kreye AVAN migrasyon an epi ki poko gen okenn BranchUser.
//
// Sa script la fè:
//   1. Jwenn tenant lan pa slug
//   2. Konte done san branch (branchId = NULL) pou chak modil
//   3. Si gen done san branch: kreye yon NOUVO branch dedye (JANM adopte
//      yon branch ki egziste deja), backfill done yo sou li
//   4. ⚠️ NOUVO — Si tenant lan gen EGZAKTEMAN yon sèl branch (kit li
//      fèk kreye kounye a, kit li te deja la), lye tout itilizatè
//      non-admin ki PA GEN okenn BranchUser ak branch sa a (kòm
//      'cashier' pa defo). Si tenant lan gen 0 oswa 2+ branch, sote
//      etap sa a — ambigwite egzije yon aksyon manyèl admin nan UI a.

const prisma = require('../src/config/prisma')

const MODELS_TO_BACKFILL = [
  { model: 'product',         label: 'Pwodui' },
  { model: 'productCategory', label: 'Kategori Pwodui' }, // ⚠️ KORIJE — te manke, se sa ki te lakòz kategori disparèt apre migrasyon
  { model: 'client',          label: 'Kliyan' },
  { model: 'quote',           label: 'Devi' },
  { model: 'invoice',         label: 'Fakti' },
  { model: 'stockMovement',   label: 'Mouvman Estòk' },
  { model: 'dryOrder',        label: 'Kòmand Dry (si modil aktif)' },
  { model: 'room',            label: 'Chanm Hotel (si modil aktif)' },
  { model: 'reservation',     label: 'Rezèvasyon Hotel (si modil aktif)' },
  { model: 'kaneEpay',        label: 'Kane Epay (si modil aktif)' },
  { model: 'pre',             label: 'Prè Mikwo Kredi (si modil aktif)' },
  { model: 'sabotayPlan',     label: 'Plan Sabotay (si modil aktif)' },
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

  const existingBranches = await prisma.branch.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' }
  })
  if (existingBranches.length > 0) {
    console.log(`ℹ️  Tenant sa a deja gen ${existingBranches.length} branch:`)
    existingBranches.forEach(b => console.log(`     - ${b.name} (${b.slug})`))
    console.log(`   ⚠️  OKENN nan yo p ap touche/adopte kòm sib backfill — nou kreye yon NOUVO branch separe si nesesè.\n`)
  }

  // ── ETAP 1: Konte done san branch AVAN nenpòt kreyasyon
  console.log('── Konte done san branch (avan kreyasyon) ──\n')
  const counts = {}
  let totalOrphans = 0

  for (const { model, label } of MODELS_TO_BACKFILL) {
    if (!prisma[model]) { console.log(`⏭️  ${label}: modil pa egziste, skip.`); continue }
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
    console.log(`\n✅ Pa gen okenn done san branch pou tenant sa a — pa gen kreyasyon/backfill branch pou fè.\n`)
  } else if (existingBranches.length >= 2) {
    // ⚠️ NOUVO — Tenant gen plizyè branch deja: pa gen fason otomatik san
    // danje pou konnen ki branch done san branch yo dwe ale. Pa kreye yon
    // nouvo branch (sa ta fann tenant lan an plis moso), pa gen chwa
    // otomatik ki san danje — mande aksyon manyèl.
    console.log(`⚠️  Tenant sa a gen ${existingBranches.length} branch deja e ${totalOrphans} done san branch.`)
    console.log(`    Pa gen fason otomatik san danje pou detèmine ki branch yo dwe ale.`)
    console.log(`    Sèvi ak SQL manyèl (menm apwòch ak repare-plus-store-branch.sql) pou idantifye`)
    console.log(`    ak deplase done sa yo pa timestamp/kontèks, oswa envestige kòman yo vin san branch.\n`)
  } else if (existingBranches.length === 1) {
    // ⚠️ NOUVO — Tenant gen DEJA egzakteman yon branch: backfill dirèkteman
    // sou branch sa a, JANM kreye yon dezyèm branch (sa ta fragmante done
    // tenant lan an de moso san rezon).
    const onlyBranch = existingBranches[0]
    console.log(`📦 Tenant sa a gen deja yon sèl branch — backfill done yo dirèkteman sou li:`)
    console.log(`   Branch: "${onlyBranch.name}" (${onlyBranch.slug})\n`)

    console.log('── Backfill pa modil ──\n')
    for (const { model, label } of MODELS_TO_BACKFILL) {
      const orphanCount = counts[model]
      if (orphanCount === undefined || orphanCount === 0) continue
      if (apply) {
        const result = await prisma[model].updateMany({
          where: { tenantId: tenant.id, branchId: null },
          data: { branchId: onlyBranch.id }
        })
        console.log(`✅ ${label}: ${result.count} liy tache sou "${onlyBranch.name}".`)
      } else {
        console.log(`(dry run) ${label}: ${orphanCount} liy ta pral tache sou "${onlyBranch.name}" (branch ki deja egziste a).`)
      }
    }
    console.log('')
  } else {
    console.log(`\n📊 Total: ${totalOrphans} done san branch jwenn.\n`)

    // ── Kreye NOUVO branch dedye SÈLMAN lè tenant lan pa gen okenn branch
    const branchName = customBranchName || tenant.name
    let baseSlug = slugify(branchName) || 'main'
    let finalSlug = baseSlug
    let suffix = 1
    while (await prisma.branch.findFirst({ where: { tenantId: tenant.id, slug: finalSlug } })) {
      suffix += 1
      finalSlug = `${baseSlug}-${suffix}`
    }

    console.log(`📦 Tenant sa a pa gen okenn branch — pral kreye NOUVO branch dedye:`)
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

    console.log('── Backfill pa modil ──\n')
    for (const { model, label } of MODELS_TO_BACKFILL) {
      const orphanCount = counts[model]
      if (orphanCount === undefined || orphanCount === 0) continue
      if (apply && newBranch) {
        const result = await prisma[model].updateMany({
          where: { tenantId: tenant.id, branchId: null },
          data: { branchId: newBranch.id }
        })
        console.log(`✅ ${label}: ${result.count} liy tache sou "${newBranch.name}".`)
      } else {
        console.log(`(dry run) ${label}: ${orphanCount} liy ta pral tache sou "${branchName}".`)
      }
    }
    console.log('')
  }

  // ── ETAP 4 (⚠️ NOUVO) — Lye kesye san BranchUser ak sèl branch tenant lan,
  // si e sèlman si tenant lan gen EGZAKTEMAN yon sèl branch total
  console.log('── Verifye kesye san BranchUser ──\n')

  const allBranches = await prisma.branch.findMany({ where: { tenantId: tenant.id } })

  if (allBranches.length === 0) {
    console.log('ℹ️  Tenant sa a pa gen okenn branch — pa gen kesye pou lye.\n')
  } else if (allBranches.length > 1) {
    console.log(`⚠️  Tenant sa a gen ${allBranches.length} branch — twòp anbigwite pou lye kesye otomatikman.`)
    console.log(`    Sèvi ak "Jere Itilizatè Branch" nan panèl admin pou asiyen kesye yo manyèlman.\n`)
  } else {
    const onlyBranch = allBranches[0]
    const allUsers = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: { not: 'admin' } },
      select: { id: true, fullName: true, email: true, role: true }
    })

    const existingLinks = await prisma.branchUser.findMany({
      where: { userId: { in: allUsers.map(u => u.id) } },
      select: { userId: true }
    })
    const linkedIds = new Set(existingLinks.map(l => l.userId))
    const unlinkedUsers = allUsers.filter(u => !linkedIds.has(u.id))

    if (unlinkedUsers.length === 0) {
      console.log(`✅ Tout itilizatè non-admin deja lye ak branch "${onlyBranch.name}".\n`)
    } else {
      console.log(`📋 ${unlinkedUsers.length} itilizatè san BranchUser jwenn (ap lye ak "${onlyBranch.name}"):`)
      unlinkedUsers.forEach(u => console.log(`     - ${u.fullName} (${u.email}) — wòl: ${u.role}`))

      if (apply) {
        for (const u of unlinkedUsers) {
          await prisma.branchUser.create({
            data: { branchId: onlyBranch.id, userId: u.id, role: 'cashier', isAdmin: false }
          })
        }
        console.log(`\n✅ ${unlinkedUsers.length} itilizatè lye ak branch "${onlyBranch.name}".\n`)
      } else {
        console.log(`\n   (dry run — okenn BranchUser pa kreye toutbon)\n`)
      }
    }
  }

  console.log(`${apply ? '✅ Migrasyon fini.' : '🔍 Dry run fini — rerun ak --apply pou aplike vrèman.'}\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('❌ Erè:', e)
  await prisma.$disconnect()
  process.exit(1)
})