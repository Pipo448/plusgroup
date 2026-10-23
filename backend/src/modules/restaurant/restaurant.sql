-- restaurant.sql — Tab modil restoran an (pòtal, kòmand an liy, rezèvasyon, vant/rapò, anyè, flyer, manje/bwason, estòk pataje)
-- Backend la kreye yo otomatikman. Si ou pito, kouri fichye sa a nan Supabase SQL Editor (Run without RLS).

CREATE TABLE IF NOT EXISTS resto_portal_settings (
    tenant_id            TEXT PRIMARY KEY,
    slug                 TEXT UNIQUE,
    enabled              BOOLEAN NOT NULL DEFAULT FALSE,
    accept_orders        BOOLEAN NOT NULL DEFAULT TRUE,
    accept_reservations  BOOLEAN NOT NULL DEFAULT TRUE,
    accepting_now        BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    pickup_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_fee_htg     NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_order_htg        NUMERIC(12,2) NOT NULL DEFAULT 0,
    prep_minutes         INTEGER NOT NULL DEFAULT 30,
    phone                TEXT,
    whatsapp             TEXT,
    address              TEXT,
    hours_text           TEXT,
    welcome_message      TEXT,
    payment_methods      JSONB NOT NULL DEFAULT '["cash"]'::jsonb,
    moncash_number       TEXT,
    reservation_slots    JSONB NOT NULL DEFAULT '["12:00","12:30","13:00","13:30","18:00","18:30","19:00","19:30","20:00","20:30"]'::jsonb,
    slot_capacity        INTEGER NOT NULL DEFAULT 4,
    max_party            INTEGER NOT NULL DEFAULT 12,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

CREATE TABLE IF NOT EXISTS resto_online_orders (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    code              TEXT NOT NULL,
    customer_name     TEXT NOT NULL,
    customer_phone    TEXT NOT NULL,
    customer_address  TEXT,
    mode              TEXT NOT NULL DEFAULT 'pickup',
    payment_method    TEXT NOT NULL DEFAULT 'cash',
    notes             TEXT,
    items             JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_htg      NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee_htg  NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_htg         NUMERIC(12,2) NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'nouvo',
    history           JSONB NOT NULL DEFAULT '[]'::jsonb,
    invoice_id        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
  );

CREATE INDEX IF NOT EXISTS idx_resto_orders_tenant_status ON resto_online_orders (tenant_id, status, created_at DESC);

ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS rating INTEGER;

ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS review TEXT;

ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

ALTER TABLE resto_portal_settings ADD COLUMN IF NOT EXISTS dashboard_mode TEXT;

CREATE TABLE IF NOT EXISTS resto_shared_products (
    tenant_id    TEXT NOT NULL,
    product_id   TEXT NOT NULL,
    category_id  TEXT,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, product_id)
  );

CREATE TABLE IF NOT EXISTS resto_category_meta (
    tenant_id    TEXT NOT NULL,
    category_id  TEXT NOT NULL,
    kind         TEXT NOT NULL DEFAULT 'food',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, category_id)
  );

CREATE TABLE IF NOT EXISTS resto_flyers (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    title       TEXT,
    image       TEXT NOT NULL,
    mime        TEXT NOT NULL DEFAULT 'image/webp',
    width       INTEGER,
    height      INTEGER,
    bytes       INTEGER,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

CREATE INDEX IF NOT EXISTS idx_resto_flyers_tenant ON resto_flyers (tenant_id, position);

ALTER TABLE resto_portal_settings
     ADD COLUMN IF NOT EXISTS listed    BOOLEAN NOT NULL DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS city      TEXT,
     ADD COLUMN IF NOT EXISTS cuisine   TEXT;

CREATE TABLE IF NOT EXISTS resto_sales (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    branch_id       TEXT,
    source          TEXT NOT NULL,
    ref_id          TEXT NOT NULL,
    ref_label       TEXT,
    invoice_id      TEXT,
    items           JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_htg    NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_htg    NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee_htg NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_htg       NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    amount_given    NUMERIC(12,2),
    change_htg      NUMERIC(12,2),
    cashier_id      TEXT,
    cashier_name    TEXT,
    server_id       TEXT,
    server_name     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, source, ref_id)
  );

CREATE INDEX IF NOT EXISTS idx_resto_sales_tenant_date ON resto_sales (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS resto_reservations (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    code            TEXT NOT NULL,
    customer_name   TEXT NOT NULL,
    customer_phone  TEXT NOT NULL,
    customer_email  TEXT,
    party_size      INTEGER NOT NULL DEFAULT 2,
    res_date        DATE NOT NULL,
    res_time        TEXT NOT NULL,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'an_atant',
    table_id        TEXT,
    table_name      TEXT,
    source          TEXT NOT NULL DEFAULT 'online',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
  );

CREATE INDEX IF NOT EXISTS idx_resto_resv_tenant_date ON resto_reservations (tenant_id, res_date, res_time);