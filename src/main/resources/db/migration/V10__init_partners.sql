-- ============================================================
-- V10: Partners Module
-- Tables: partners
-- ALTER: sales (add partner_id)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PARTNERS (hamkorlar)
-- ------------------------------------------------------------
CREATE TABLE partners
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    phone      VARCHAR(20)  NOT NULL UNIQUE,
    notes      TEXT,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP             DEFAULT NOW(),
    updated_at TIMESTAMP             DEFAULT NOW(),
    created_by BIGINT REFERENCES users (id),
    updated_by BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 2. ALTER sales — partner_id qo'shish
-- ------------------------------------------------------------
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES partners (id);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_partners_phone  ON partners (phone);
CREATE INDEX IF NOT EXISTS idx_sales_partner   ON sales (partner_id);