-- ============================================================
-- MIGRATION: Add Multi-Branch System
-- PLUS GROUP — Innov@tion & Tech
-- ============================================================

-- 1. Ajoute max_branches nan subscription_plans
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "max_branches" INTEGER NOT NULL DEFAULT 1;

-- 2. Kreye tablo branches
CREATE TABLE IF NOT EXISTS "branches" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "name"         VARCHAR(200) NOT NULL,
  "slug"         VARCHAR(100) NOT NULL,
  "description"  TEXT,
  "address"      TEXT,
  "phone"        VARCHAR(50),
  "email"        VARCHAR(150),
  "is_active"    BOOLEAN      NOT NULL DEFAULT false,
  "unlocked_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branches_tenant_id_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "branches_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- 3. Kreye tablo branch_users
CREATE TABLE IF NOT EXISTS "branch_users" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "branch_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "role"       "UserRole"   NOT NULL DEFAULT 'cashier',
  "is_admin"   BOOLEAN      NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "branch_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_users_branch_id_user_id_key" UNIQUE ("branch_id", "user_id"),
  CONSTRAINT "branch_users_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
  CONSTRAINT "branch_users_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 4. Ajoute branch_id nan tables kle
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL;

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL;

ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL;

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL;

ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL;

-- 5. Ajoute password_changed_at nan users (si pa egziste)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ;

-- 6. Indexes pou pèfòmans
CREATE INDEX IF NOT EXISTS "branches_tenant_id_idx" ON "branches"("tenant_id");
CREATE INDEX IF NOT EXISTS "branch_users_branch_id_idx" ON "branch_users"("branch_id");
CREATE INDEX IF NOT EXISTS "branch_users_user_id_idx" ON "branch_users"("user_id");
CREATE INDEX IF NOT EXISTS "products_branch_id_idx" ON "products"("branch_id");
CREATE INDEX IF NOT EXISTS "clients_branch_id_idx" ON "clients"("branch_id");
CREATE INDEX IF NOT EXISTS "quotes_branch_id_idx" ON "quotes"("branch_id");
CREATE INDEX IF NOT EXISTS "invoices_branch_id_idx" ON "invoices"("branch_id");

-- 7. Mete max_branches pou plan egzistan
UPDATE "subscription_plans" SET "max_branches" = 1  WHERE "name" = 'Estanda';
UPDATE "subscription_plans" SET "max_branches" = 3  WHERE "name" = 'Biznis';
UPDATE "subscription_plans" SET "max_branches" = 10 WHERE "name" = 'Premyum';
UPDATE "subscription_plans" SET "max_branches" = 999 WHERE "name" = 'Antepriz';
