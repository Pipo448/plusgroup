# PLUS GROUP — Innov@tion & Tech
## SaaS Stock & Facturation — Backend API v1.0

---

## 🚀 Instalasyon Rapid

```bash
# 1. Klon/kopye pwojè a
cd plusgroup-saas

# 2. Enstale depandans yo
npm install

# 3. Konfigire environment
cp .env.example .env
# Edite .env ak ou DATABASE_URL + secrets yo

# 4. Migrasyon baz done
npx prisma migrate dev --name init

# 5. Seed done inisyal
npm run db:seed

# 6. Lanse API a
npm run dev
```

---

## 📁 Striktire Dosye

```
plusgroup-saas/
├── prisma/
│   ├── schema.prisma        # Tout modèl done yo
│   └── seed.js              # Done inisyal (admin, plans, demo)
├── src/
│   ├── index.js             # Pwen depa Express app
│   ├── config/
│   │   ├── logger.js        # Winston logger
│   │   └── prisma.js        # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.js          # JWT + Multi-tenant isolation
│   │   └── errorHandler.js  # Gestion erè global
│   └── modules/
│       ├── admin/           # Super Admin Panel
│       ├── auth/            # Login, logout, reset password
│       ├── tenants/         # Paramèt entreprise
│       ├── users/           # Jesyon itilizatè
│       ├── products/        # Pwodui & Kategori
│       ├── clients/         # Kliyan
│       ├── quotes/          # Devis (Proforma)
│       ├── invoices/        # Facture finale
│       ├── payments/        # Peman
│       ├── stock/           # Mouvman stock
│       └── reports/         # Rapò & Statistik
└── uploads/                 # Logo, imaj
```

---

## 🔌 Tout Endpoints API

### Super Admin  `BASE: /api/v1/admin`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| POST | /login | Koneksyon super admin |
| GET | /tenants | Tout entreprise yo |
| GET | /tenants/:id | Yon entreprise |
| POST | /tenants | Kreye entreprise + admin |
| PATCH | /tenants/:id/status | Aktive / Suspann |
| GET | /plans | Tout plans abonnement |
| GET | /stats | Statistik global |

### Auth  `BASE: /api/v1/auth`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| POST | /login | Koneksyon itilizatè |
| POST | /logout | Dekoneksyon |
| GET | /me | Pwofil itilizatè |
| POST | /forgot-password | Reyinisyalizasyon modpas |
| POST | /reset-password | Nouvo modpas |
| PATCH | /change-password | Chanje modpas |

### Tenant  `BASE: /api/v1/tenant`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | /settings | Paramèt entreprise |
| PUT | /settings | Modifye paramèt |
| PATCH | /exchange-rate | Chanje taux HTG/USD |
| POST | /logo | Upload logo |
| GET | /sequences | Séquences dokiman |
| PUT | /sequences/:type | Modifye prefix |

### Produits  `BASE: /api/v1/products`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | / | Tout pwodui (filtre, paginasyon) |
| GET | /low-stock | Pwodui ki ba |
| GET | /:id | Yon pwodui |
| POST | / | Kreye pwodui |
| PUT | /:id | Modifye pwodui |
| DELETE | /:id | Siprime (soft) |
| GET | /categories/list | Tout kategori |
| POST | /categories/create | Kreye kategori |
| PUT | /categories/:id | Modifye kategori |
| DELETE | /categories/:id | Siprime kategori |

### Kliyan  `BASE: /api/v1/clients`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | / | Tout kliyan |
| GET | /:id | Yon kliyan + istorik |
| POST | / | Kreye kliyan |
| PUT | /:id | Modifye kliyan |
| DELETE | /:id | Siprime (soft) |

### Devis  `BASE: /api/v1/quotes`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | / | Tout devis |
| GET | /:id | Yon devis + atik yo |
| POST | / | Kreye devis |
| PUT | /:id | Modifye devis |
| PATCH | /:id/send | Voye devis |
| PATCH | /:id/cancel | Anile devis |
| **POST** | **/:id/convert** | **Konvèti → Facture** ⭐ |

### Factures  `BASE: /api/v1/invoices`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | / | Tout facture |
| GET | /dashboard | Rezime rapid |
| GET | /:id | Yon facture konplè |
| PATCH | /:id/cancel | Anile (restore stock) |
| POST | /:id/payment | Anrejistre peman |

### Stock  `BASE: /api/v1/stock`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | /movements | Istwa mouvman |
| POST | /adjust | Ajisteman manuel |
| POST | /purchase | Reapwovizonnman |

### Peman  `BASE: /api/v1/payments`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | / | Istwa peman |

### Rapò  `BASE: /api/v1/reports`
| Méthode | Endpoint | Aksyon |
|---------|----------|--------|
| GET | /sales | Vant pa peryòd |
| GET | /stock | Rapò stock konplè |
| GET | /top-products | Top pwodui yo |

---

## 🔐 Kòman Fè Demann API

```javascript
// Tout demann biznis yo bezwen 2 headers:
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'X-Tenant-Slug': 'plus-store'   // slug entreprise ou a
}
```

---

## 🔁 Flou Devis → Facture

```
1. POST /quotes          → kreye devis (draft)
2. PATCH /quotes/:id/send  → voye bay kliyan (optional)
3. POST /quotes/:id/convert → facture kreye OTOMATIKMAN
                              stock redui otomatikman
                              numéro FAC-2025-0001 jenere
```

---

## 📊 Variables Environnement (.env)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/plusgroup_saas"
JWT_SECRET=your_secret_here
SUPER_ADMIN_JWT_SECRET=your_super_admin_secret_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

---

## 📦 Striktire Multi-Tenant

Chak demann a **isolé otomatikman** pa `tenant_id`.
Mitan middleware `auth.js` verifye:
1. `X-Tenant-Slug` header → jwenn tenant la
2. JWT token → konfime itilizatè a ap travay nan bon tenant
3. Chak query Prisma gen `tenantId` obligatwa

**Rezilta**: Entreprise A pa janm wè done Entreprise B. ✅

---

*PLUS GROUP — Innov@tion & Tech © 2025*
