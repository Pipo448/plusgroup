-- ============================================================
-- SYSTÈME DE GESTION DE STOCKAGE MULTI-ENTREPRISE (SAAS)
-- Plus Innovation & Tech — Database Schema v1.0
-- PostgreSQL — Multi-Tenant (tenant_id strategy)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SUPER ADMIN — Gestion Globale
-- ============================================================

CREATE TABLE super_admins (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Plans d'abonnement disponibles
CREATE TABLE subscription_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,          -- Ex: Basik, Standad, Premium
    name_fr         VARCHAR(100),
    name_en         VARCHAR(100),
    max_users       INTEGER DEFAULT 5,
    max_products    INTEGER DEFAULT 500,
    price_monthly   DECIMAL(10,2) NOT NULL,
    price_annual    DECIMAL(10,2),
    features        JSONB DEFAULT '[]',             -- Liste de fonctionnalités
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TENANTS — Entreprises
-- ============================================================

CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');
CREATE TYPE default_currency AS ENUM ('HTG', 'USD');
CREATE TYPE default_language AS ENUM ('ht', 'fr', 'en');

CREATE TABLE tenants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Identification
    name                VARCHAR(200) NOT NULL,
    slug                VARCHAR(100) UNIQUE NOT NULL,  -- sous-domaine: entreprise1
    -- Branding
    logo_url            TEXT,
    primary_color       VARCHAR(7) DEFAULT '#1E40AF',
    -- Coordonnées
    address             TEXT,
    phone               VARCHAR(50),
    email               VARCHAR(150),
    website             VARCHAR(200),
    -- Paramètres
    default_currency    default_currency DEFAULT 'HTG',
    default_language    default_language DEFAULT 'ht',
    exchange_rate       DECIMAL(10,4) DEFAULT 125.00,  -- 1 USD = X HTG
    tax_rate            DECIMAL(5,2) DEFAULT 0,         -- TVA %
    -- Abonnement
    plan_id             UUID REFERENCES subscription_plans(id),
    status              tenant_status DEFAULT 'pending',
    trial_ends_at       TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    -- Meta
    created_by          UUID REFERENCES super_admins(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Historique abonnements
CREATE TABLE tenant_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES subscription_plans(id),
    billing_cycle   VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'annual')),
    amount_paid     DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'USD',
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    payment_ref     VARCHAR(200),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. UTILISATEURS — Par Entreprise
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'stock_manager', 'viewer');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Informations
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(50),
    avatar_url      TEXT,
    -- Rôle & Accès
    role            user_role DEFAULT 'cashier',
    permissions     JSONB DEFAULT '{}',             -- permissions granulaires
    preferred_lang  default_language DEFAULT 'ht',
    -- État
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    -- Meta
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Contrainte: email unique par entreprise
    UNIQUE(tenant_id, email)
);

-- ============================================================
-- 4. PRODUITS & CATÉGORIES — Par Entreprise
-- ============================================================

CREATE TABLE product_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    name_fr         VARCHAR(100),
    name_en         VARCHAR(100),
    description     TEXT,
    color           VARCHAR(7),                     -- couleur UI
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    -- Informations produit
    code                VARCHAR(100),               -- code barre ou référence
    name                VARCHAR(200) NOT NULL,
    name_fr             VARCHAR(200),
    name_en             VARCHAR(200),
    description         TEXT,
    unit                VARCHAR(50) DEFAULT 'unité', -- unité de mesure
    -- Prix
    price_htg           DECIMAL(12,2) DEFAULT 0,
    price_usd           DECIMAL(12,2) DEFAULT 0,
    cost_price_htg      DECIMAL(12,2) DEFAULT 0,    -- prix d'achat
    -- Stock
    quantity            DECIMAL(12,3) DEFAULT 0,
    alert_threshold     DECIMAL(12,3) DEFAULT 5,    -- seuil d'alerte
    -- Image
    image_url           TEXT,
    -- État
    is_active           BOOLEAN DEFAULT TRUE,
    is_service          BOOLEAN DEFAULT FALSE,       -- produit ou service
    -- Meta
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ============================================================
-- 5. CLIENTS — Par Entreprise
-- ============================================================

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Informations
    client_type     VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
    name            VARCHAR(200) NOT NULL,
    company_name    VARCHAR(200),
    email           VARCHAR(150),
    phone           VARCHAR(50),
    phone2          VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    nif             VARCHAR(50),                    -- Numéro d'identification fiscale
    -- Financier
    credit_limit    DECIMAL(12,2) DEFAULT 0,
    balance         DECIMAL(12,2) DEFAULT 0,        -- solde dû
    preferred_currency default_currency DEFAULT 'HTG',
    -- Notes
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    -- Meta
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. DEVIS (PROFORMA INVOICE) — OBLIGATOIRE
-- ============================================================

CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'converted', 'cancelled', 'expired');

CREATE TABLE quotes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Numérotation
    quote_number    VARCHAR(50) NOT NULL,            -- DEV-2024-001
    -- Client
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_snapshot JSONB NOT NULL,                 -- snapshot client au moment du devis
    -- Devise
    currency        default_currency DEFAULT 'HTG',
    exchange_rate   DECIMAL(10,4) NOT NULL,         -- taux au moment du devis
    -- Montants
    subtotal_htg    DECIMAL(14,2) DEFAULT 0,
    subtotal_usd    DECIMAL(14,2) DEFAULT 0,
    discount_type   VARCHAR(10) DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percent')),
    discount_value  DECIMAL(10,2) DEFAULT 0,
    discount_htg    DECIMAL(14,2) DEFAULT 0,
    discount_usd    DECIMAL(14,2) DEFAULT 0,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    tax_htg         DECIMAL(14,2) DEFAULT 0,
    tax_usd         DECIMAL(14,2) DEFAULT 0,
    total_htg       DECIMAL(14,2) DEFAULT 0,
    total_usd       DECIMAL(14,2) DEFAULT 0,
    -- Statut
    status          quote_status DEFAULT 'draft',
    -- Dates
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date     DATE,
    -- Contenu
    notes           TEXT,
    terms           TEXT,
    -- Meta
    created_by      UUID REFERENCES users(id),
    converted_to_invoice_id UUID,                   -- rempli après conversion
    converted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, quote_number)
);

-- Lignes de devis
CREATE TABLE quote_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    -- Produit
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL,                -- snapshot produit
    -- Quantité & Prix
    quantity        DECIMAL(12,3) NOT NULL,
    unit_price_htg  DECIMAL(12,2) NOT NULL,
    unit_price_usd  DECIMAL(12,2) NOT NULL,
    discount_pct    DECIMAL(5,2) DEFAULT 0,
    total_htg       DECIMAL(14,2) NOT NULL,
    total_usd       DECIMAL(14,2) NOT NULL,
    -- Ordre
    sort_order      INTEGER DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. FACTURES FINALES — Générées depuis Devis
-- ============================================================

CREATE TYPE invoice_status AS ENUM ('unpaid', 'partial', 'paid', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'moncash', 'natcash', 'check', 'other');

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Numérotation automatique par entreprise
    invoice_number      VARCHAR(50) NOT NULL,        -- FAC-2024-001
    -- Source (devis obligatoire)
    quote_id            UUID NOT NULL REFERENCES quotes(id),
    -- Client
    client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_snapshot     JSONB NOT NULL,
    -- Devise
    currency            default_currency DEFAULT 'HTG',
    exchange_rate       DECIMAL(10,4) NOT NULL,
    -- Montants (identiques au devis validé)
    subtotal_htg        DECIMAL(14,2) DEFAULT 0,
    subtotal_usd        DECIMAL(14,2) DEFAULT 0,
    discount_type       VARCHAR(10) DEFAULT 'amount',
    discount_value      DECIMAL(10,2) DEFAULT 0,
    discount_htg        DECIMAL(14,2) DEFAULT 0,
    discount_usd        DECIMAL(14,2) DEFAULT 0,
    tax_rate            DECIMAL(5,2) DEFAULT 0,
    tax_htg             DECIMAL(14,2) DEFAULT 0,
    tax_usd             DECIMAL(14,2) DEFAULT 0,
    total_htg           DECIMAL(14,2) DEFAULT 0,
    total_usd           DECIMAL(14,2) DEFAULT 0,
    amount_paid_htg     DECIMAL(14,2) DEFAULT 0,
    amount_paid_usd     DECIMAL(14,2) DEFAULT 0,
    balance_due_htg     DECIMAL(14,2) DEFAULT 0,
    balance_due_usd     DECIMAL(14,2) DEFAULT 0,
    -- Statut
    status              invoice_status DEFAULT 'unpaid',
    -- Dates
    issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE,
    -- Contenu
    notes               TEXT,
    terms               TEXT,
    -- Stock déjà décrémenté
    stock_decremented   BOOLEAN DEFAULT FALSE,
    -- Meta
    created_by          UUID REFERENCES users(id),
    cancelled_by        UUID REFERENCES users(id),
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- Lignes de facture (copiées depuis quote_items)
CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    -- Produit
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    product_snapshot JSONB NOT NULL,
    -- Quantité & Prix
    quantity        DECIMAL(12,3) NOT NULL,
    unit_price_htg  DECIMAL(12,2) NOT NULL,
    unit_price_usd  DECIMAL(12,2) NOT NULL,
    discount_pct    DECIMAL(5,2) DEFAULT 0,
    total_htg       DECIMAL(14,2) NOT NULL,
    total_usd       DECIMAL(14,2) NOT NULL,
    -- Stock
    stock_before    DECIMAL(12,3),                  -- stock avant décrémentation
    stock_after     DECIMAL(12,3),                  -- stock après décrémentation
    sort_order      INTEGER DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PAIEMENTS — Par Facture
-- ============================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    -- Montant
    amount_htg      DECIMAL(14,2) DEFAULT 0,
    amount_usd      DECIMAL(14,2) DEFAULT 0,
    currency        default_currency DEFAULT 'HTG',
    exchange_rate   DECIMAL(10,4),
    -- Méthode
    method          payment_method DEFAULT 'cash',
    reference       VARCHAR(200),                   -- numéro transaction
    -- Date
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    -- Meta
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. MOUVEMENTS DE STOCK — Traçabilité Complète
-- ============================================================

CREATE TYPE stock_movement_type AS ENUM (
    'sale',         -- vente (facture finale)
    'purchase',     -- achat / réapprovisionnement
    'adjustment',   -- ajustement manuel
    'return',       -- retour client
    'loss',         -- perte / avarie
    'transfer'      -- transfert interne
);

CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- Type et référence
    movement_type   stock_movement_type NOT NULL,
    reference_id    UUID,                           -- invoice_id, purchase_id, etc.
    reference_type  VARCHAR(50),                    -- 'invoice', 'purchase', 'adjustment'
    -- Quantités
    quantity_before DECIMAL(12,3) NOT NULL,
    quantity_change DECIMAL(12,3) NOT NULL,         -- positif = entrée, négatif = sortie
    quantity_after  DECIMAL(12,3) NOT NULL,
    -- Coût
    unit_cost_htg   DECIMAL(12,2),
    -- Notes
    notes           TEXT,
    -- Meta
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. SÉQUENCES — Numérotation Automatique par Entreprise
-- ============================================================

CREATE TABLE document_sequences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type   VARCHAR(20) NOT NULL CHECK (document_type IN ('quote', 'invoice')),
    prefix          VARCHAR(20) DEFAULT 'DOC',      -- DEV, FAC, etc.
    last_number     INTEGER DEFAULT 0,
    year_reset      BOOLEAN DEFAULT TRUE,           -- reset chaque année
    current_year    INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, document_type)
);

-- ============================================================
-- 11. LOGS D'ACTIVITÉ — Audit Complet
-- ============================================================

CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Action
    action          VARCHAR(100) NOT NULL,          -- 'create_invoice', 'update_product', etc.
    entity_type     VARCHAR(50),                    -- 'invoice', 'product', 'user', etc.
    entity_id       UUID,
    -- Données
    old_data        JSONB,
    new_data        JSONB,
    -- Contexte
    ip_address      INET,
    user_agent      TEXT,
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. NOTIFICATIONS — Alertes Système
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    -- Contenu
    type            VARCHAR(50) NOT NULL,           -- 'low_stock', 'invoice_due', etc.
    title_ht        TEXT,
    title_fr        TEXT,
    title_en        TEXT,
    message_ht      TEXT,
    message_fr      TEXT,
    message_en      TEXT,
    -- Référence
    entity_type     VARCHAR(50),
    entity_id       UUID,
    -- Statut
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — Performance Multi-Tenant
-- ============================================================

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Users
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(tenant_id, role);

-- Products
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(tenant_id, category_id);
CREATE INDEX idx_products_code ON products(tenant_id, code);
CREATE INDEX idx_products_stock ON products(tenant_id, quantity);
CREATE INDEX idx_products_active ON products(tenant_id, is_active);

-- Clients
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_name ON clients(tenant_id, name);

-- Quotes
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_client ON quotes(tenant_id, client_id);
CREATE INDEX idx_quotes_status ON quotes(tenant_id, status);
CREATE INDEX idx_quotes_number ON quotes(tenant_id, quote_number);
CREATE INDEX idx_quotes_date ON quotes(tenant_id, issue_date);

-- Quote Items
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_tenant ON quote_items(tenant_id);

-- Invoices
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_client ON invoices(tenant_id, client_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_date ON invoices(tenant_id, issue_date);
CREATE INDEX idx_invoices_quote ON invoices(quote_id);

-- Invoice Items
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_tenant ON invoice_items(tenant_id);

-- Payments
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(tenant_id, payment_date);

-- Stock Movements
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(tenant_id, product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(tenant_id, movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- Activity Logs
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction: Générer numéro document automatique (par entreprise)
CREATE OR REPLACE FUNCTION generate_document_number(
    p_tenant_id UUID,
    p_type VARCHAR(20)
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_prefix    VARCHAR(20);
    v_year      INTEGER;
    v_number    INTEGER;
    v_result    VARCHAR(50);
    v_year_reset BOOLEAN;
    v_current_year INTEGER;
BEGIN
    -- Récupérer ou créer la séquence
    SELECT prefix, last_number, year_reset, current_year
    INTO v_prefix, v_number, v_year_reset, v_current_year
    FROM document_sequences
    WHERE tenant_id = p_tenant_id AND document_type = p_type
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Créer séquence par défaut
        v_prefix := CASE p_type WHEN 'quote' THEN 'DEV' ELSE 'FAC' END;
        v_number := 0;
        v_year_reset := TRUE;
        INSERT INTO document_sequences(tenant_id, document_type, prefix, last_number)
        VALUES (p_tenant_id, p_type, v_prefix, 0);
    END IF;

    v_year := EXTRACT(YEAR FROM NOW());

    -- Reset annuel si activé
    IF v_year_reset AND v_year > v_current_year THEN
        v_number := 0;
        UPDATE document_sequences
        SET current_year = v_year, last_number = 0
        WHERE tenant_id = p_tenant_id AND document_type = p_type;
    END IF;

    -- Incrémenter
    v_number := v_number + 1;
    UPDATE document_sequences
    SET last_number = v_number, updated_at = NOW()
    WHERE tenant_id = p_tenant_id AND document_type = p_type;

    -- Format: DEV-2024-001
    v_result := v_prefix || '-' || v_year || '-' || LPAD(v_number::TEXT, 4, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- Fonction: Décrémenter stock après création facture
CREATE OR REPLACE FUNCTION decrement_stock_on_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item      RECORD;
    v_qty_before DECIMAL(12,3);
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM invoices WHERE id = p_invoice_id;

    FOR v_item IN
        SELECT ii.*, p.quantity as current_qty
        FROM invoice_items ii
        JOIN products p ON p.id = ii.product_id
        WHERE ii.invoice_id = p_invoice_id AND ii.product_id IS NOT NULL
    LOOP
        v_qty_before := v_item.current_qty;

        -- Décrémenter le stock
        UPDATE products
        SET quantity = quantity - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id AND tenant_id = v_tenant_id;

        -- Mettre à jour les snapshots dans invoice_items
        UPDATE invoice_items
        SET stock_before = v_qty_before,
            stock_after  = v_qty_before - v_item.quantity
        WHERE id = v_item.id;

        -- Enregistrer le mouvement
        INSERT INTO stock_movements(
            tenant_id, product_id, movement_type,
            reference_id, reference_type,
            quantity_before, quantity_change, quantity_after
        ) VALUES (
            v_tenant_id, v_item.product_id, 'sale',
            p_invoice_id, 'invoice',
            v_qty_before, -v_item.quantity, v_qty_before - v_item.quantity
        );
    END LOOP;

    -- Marquer le stock comme décrémenté
    UPDATE invoices SET stock_decremented = TRUE WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;


-- Trigger: updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Super Admin par défaut
INSERT INTO super_admins (name, email, password_hash)
VALUES ('Super Admin', 'admin@plusinnovation.ht', crypt('ChangeMeNow!2024', gen_salt('bf')));

-- Plans d'abonnement
INSERT INTO subscription_plans (name, name_fr, name_en, max_users, max_products, price_monthly, price_annual, features) VALUES
('Basik',    'Basique',      'Basic',      3,   100,  20.00,  200.00, '["stock", "quotes", "invoices"]'),
('Standad',  'Standard',     'Standard',   10,  1000, 45.00,  450.00, '["stock", "quotes", "invoices", "reports", "multi_user"]'),
('Premium',  'Premium',      'Premium',    999, 9999, 80.00,  800.00, '["stock", "quotes", "invoices", "reports", "multi_user", "api", "custom_branding"]');

-- ============================================================
-- FIN DU SCHEMA
-- ============================================================
