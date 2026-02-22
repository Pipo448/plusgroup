// prisma/seed.js — Données initiales PLUS GROUP SaaS
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PLUS GROUP SaaS database...');

  // 1. Super Admin
  const adminHash = await bcrypt.hash('PlusAdmin2024!', 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@plusinnovation.ht' },
    update: {},
    create: {
      name: 'Super Admin Plus',
      email: 'admin@plusinnovation.ht',
      passwordHash: adminHash
    }
  });
  console.log('✅ Super Admin kreye:', superAdmin.email);

  // 2. Plans abonnement
  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-basik' },
      update: {},
      create: {
        id: 'plan-basik',
        name: 'Basik', nameFr: 'Basique', nameEn: 'Basic',
        maxUsers: 3, maxProducts: 100,
        priceMonthly: 20.00, priceAnnual: 200.00,
        features: ['stock', 'quotes', 'invoices']
      }
    }),
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-standad' },
      update: {},
      create: {
        id: 'plan-standad',
        name: 'Standad', nameFr: 'Standard', nameEn: 'Standard',
        maxUsers: 10, maxProducts: 1000,
        priceMonthly: 45.00, priceAnnual: 450.00,
        features: ['stock', 'quotes', 'invoices', 'reports', 'multi_user']
      }
    }),
    prisma.subscriptionPlan.upsert({
      where: { id: 'plan-premium' },
      update: {},
      create: {
        id: 'plan-premium',
        name: 'Premium', nameFr: 'Premium', nameEn: 'Premium',
        maxUsers: 999, maxProducts: 9999,
        priceMonthly: 80.00, priceAnnual: 800.00,
        features: ['stock', 'quotes', 'invoices', 'reports', 'multi_user', 'api', 'custom_branding']
      }
    })
  ]);
  console.log('✅ Plans kreye:', plans.length);

  // 3. Tenant de démonstration (Plus Store)
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'plus-store' },
    update: {},
    create: {
      name: 'Plus Store',
      slug: 'plus-store',
      email: 'store@plusgroup.ht',
      phone: '+509 3700-0000',
      address: 'Ouanaminthe, Nord-Est, Haïti',
      defaultCurrency: 'HTG',
      defaultLanguage: 'ht',
      exchangeRate: 132.50,
      taxRate: 0,
      planId: 'plan-standad',
      status: 'active',
      primaryColor: '#1E40AF',
      createdBy: superAdmin.id
    }
  });
  console.log('✅ Tenant demo kreye:', demoTenant.name);

  // 4. Admin utilisateur pour le tenant demo
  const userHash = await bcrypt.hash('PlusStore2024!', 12);
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@plusstore.ht' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      fullName: 'Administrateur Plus Store',
      email: 'admin@plusstore.ht',
      passwordHash: userHash,
      role: 'admin',
      preferredLang: 'ht'
    }
  });
  console.log('✅ Admin user kreye:', adminUser.email);

  // 5. Caissier pour le tenant demo
  const cashierHash = await bcrypt.hash('Caissier2024!', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'caissier@plusstore.ht' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      fullName: 'Jean Pierre',
      email: 'caissier@plusstore.ht',
      passwordHash: cashierHash,
      role: 'cashier',
      preferredLang: 'ht'
    }
  });

  // 6. Catégories produits demo
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { tenantId_name: { tenantId: demoTenant.id, name: 'Elektronik' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Elektronik', nameFr: 'Électronique', nameEn: 'Electronics', color: '#3B82F6' }
    }),
    prisma.productCategory.upsert({
      where: { tenantId_name: { tenantId: demoTenant.id, name: 'Manje & Bwason' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Manje & Bwason', nameFr: 'Alimentation', nameEn: 'Food & Drinks', color: '#10B981' }
    }),
    prisma.productCategory.upsert({
      where: { tenantId_name: { tenantId: demoTenant.id, name: 'Aksesorè' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Aksesorè', nameFr: 'Accessoires', nameEn: 'Accessories', color: '#F59E0B' }
    })
  ]);
  console.log('✅ Kategori kreye:', categories.length);

  // 7. Produits demo
  const products = await Promise.all([
    prisma.product.upsert({
      where: { tenantId_code: { tenantId: demoTenant.id, code: 'PROD-001' } },
      update: {},
      create: {
        tenantId: demoTenant.id, categoryId: categories[0].id,
        code: 'PROD-001', name: 'Telefòn Samsung A54',
        nameFr: 'Samsung A54', nameEn: 'Samsung A54',
        unit: 'pyes', priceHtg: 26500, priceUsd: 200,
        costPriceHtg: 19875, quantity: 15, alertThreshold: 3,
        createdBy: adminUser.id
      }
    }),
    prisma.product.upsert({
      where: { tenantId_code: { tenantId: demoTenant.id, code: 'PROD-002' } },
      update: {},
      create: {
        tenantId: demoTenant.id, categoryId: categories[0].id,
        code: 'PROD-002', name: 'Tablèt Amazon Fire',
        unit: 'pyes', priceHtg: 13250, priceUsd: 100,
        costPriceHtg: 9937, quantity: 8, alertThreshold: 2,
        createdBy: adminUser.id
      }
    }),
    prisma.product.upsert({
      where: { tenantId_code: { tenantId: demoTenant.id, code: 'PROD-003' } },
      update: {},
      create: {
        tenantId: demoTenant.id, categoryId: categories[1].id,
        code: 'PROD-003', name: 'Dlo Kulèv 1.5L',
        unit: 'bout', priceHtg: 60, priceUsd: 0.45,
        costPriceHtg: 35, quantity: 200, alertThreshold: 20,
        createdBy: adminUser.id
      }
    })
  ]);
  console.log('✅ Pwodui demo kreye:', products.length);

  // 8. Client demo
  const client = await prisma.client.upsert({
    where: { id: 'client-demo-001' },
    update: {},
    create: {
      id: 'client-demo-001',
      tenantId: demoTenant.id,
      name: 'Marie Joseph',
      phone: '+509 3600-1234',
      address: 'Ouanaminthe',
      preferredCurrency: 'HTG',
      createdBy: adminUser.id
    }
  });
  console.log('✅ Kliyan demo kreye:', client.name);

  // 9. Séquences documents
  await Promise.all([
    prisma.documentSequence.upsert({
      where: { tenantId_documentType: { tenantId: demoTenant.id, documentType: 'quote' } },
      update: {},
      create: { tenantId: demoTenant.id, documentType: 'quote', prefix: 'DEV', lastNumber: 0, currentYear: 2025 }
    }),
    prisma.documentSequence.upsert({
      where: { tenantId_documentType: { tenantId: demoTenant.id, documentType: 'invoice' } },
      update: {},
      create: { tenantId: demoTenant.id, documentType: 'invoice', prefix: 'FAC', lastNumber: 0, currentYear: 2025 }
    })
  ]);

  console.log('\n🎉 Seed konplè!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Super Admin:  admin@plusinnovation.ht');
  console.log('🔑 Modpas:       PlusAdmin2024!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏪 Tenant demo:  plus-store (X-Tenant-Slug: plus-store)');
  console.log('📧 Admin:        admin@plusstore.ht');
  console.log('🔑 Modpas:       PlusStore2024!');
  console.log('📧 Caissier:     caissier@plusstore.ht');
  console.log('🔑 Modpas:       Caissier2024!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Erè seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
