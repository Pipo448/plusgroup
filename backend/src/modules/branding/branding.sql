-- Koulè anblèm chak tenant. Tab la kreye otomatikman, men ou ka egzekite sa
-- nan Supabase (SQL Editor → "Run without RLS") si w prefere fè l alamen.
CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id       TEXT PRIMARY KEY,
  primary_color   TEXT NOT NULL,
  secondary_color TEXT,
  sidebar_style   TEXT NOT NULL DEFAULT 'dark',
  apply_portal    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);