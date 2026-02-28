-- ============================================================
-- V8: Purchase Module
-- Tables: purchases, purchase_items, purchase_payments
--         + supplier_debts ga purchase_id qo'shish
-- ============================================================

-- ------------------------------------------------------------
-- 1. PURCHASES (asosiy xarid)
-- ------------------------------------------------------------
CREATE TABLE purchases
(
    id            BIGSERIAL PRIMARY KEY,
    reference_no  VARCHAR(50) NOT NULL UNIQUE,   -- avtomatik: PUR-20250101-0001
    supplier_id   BIGINT      NOT NULL REFERENCES suppliers (id),
    warehouse_id  BIGINT      NOT NULL REFERENCES warehouses (id),

    status        VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- PENDING, RECEIVED, PARTIALLY_RECEIVED, CANCELLED

    total_amount  NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- jami summa
    paid_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- to'langan summa
    debt_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- qarz (total - paid)

    notes         TEXT,
    expected_at   TIMESTAMP,                           -- kutilgan yetkazib berish sanasi
    received_at   TIMESTAMP,                           -- haqiqiy qabul sanasi

    -- Audit
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    created_by    BIGINT REFERENCES users (id),
    updated_by    BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 2. PURCHASE ITEMS (xarid tarkibi)
-- ------------------------------------------------------------
CREATE TABLE purchase_items
(
    id              BIGSERIAL PRIMARY KEY,
    purchase_id     BIGINT         NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
    product_unit_id BIGINT         NOT NULL REFERENCES product_units (id),

    quantity        NUMERIC(18, 3) NOT NULL,
    unit_price      NUMERIC(18, 2) NOT NULL,   -- kelish narxi
    total_price     NUMERIC(18, 2) NOT NULL,   -- quantity * unit_price

    -- Qabul qilingan miqdor (qisman qabul uchun)
    received_qty    NUMERIC(18, 3) NOT NULL DEFAULT 0,

    created_at      TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. PURCHASE PAYMENTS (to'lovlar tarixi)
-- ------------------------------------------------------------
CREATE TABLE purchase_payments
(
    id             BIGSERIAL PRIMARY KEY,
    purchase_id    BIGINT         NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
    supplier_id    BIGINT         NOT NULL REFERENCES suppliers (id),

    amount         NUMERIC(18, 2) NOT NULL,
    payment_method VARCHAR(20)    NOT NULL DEFAULT 'CASH',
    -- CASH, CARD, TRANSFER

    note           TEXT,
    paid_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    paid_by        BIGINT REFERENCES users (id),

    created_at     TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. SUPPLIER_DEBTS ga purchase_id qo'shish
-- ------------------------------------------------------------
ALTER TABLE supplier_debts
    ADD COLUMN IF NOT EXISTS purchase_id BIGINT REFERENCES purchases (id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_purchases_supplier        ON purchases (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_warehouse       ON purchases (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status          ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at      ON purchases (created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase   ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_unit ON purchase_items (product_unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase ON purchase_payments (purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_supplier ON purchase_payments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_purchase   ON supplier_debts (purchase_id);