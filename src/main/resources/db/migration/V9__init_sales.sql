-- ============================================================
-- V9: Sales Module
-- Tables: customers, shifts, sales, sale_items,
--         sale_payments, customer_debts
-- ============================================================

-- ------------------------------------------------------------
-- 1. CUSTOMERS (mijozlar)
-- ------------------------------------------------------------
CREATE TABLE customers
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
-- 2. SHIFTS (kassir smenalari)
-- ------------------------------------------------------------
CREATE TABLE shifts
(
    id               BIGSERIAL PRIMARY KEY,
    cashier_id       BIGINT         NOT NULL REFERENCES users (id),
    warehouse_id     BIGINT         NOT NULL REFERENCES warehouses (id),

    status           VARCHAR(20)    NOT NULL DEFAULT 'OPEN',
    -- OPEN, CLOSED

    opening_cash     NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- smena boshlanganda kassadagi naqd
    closing_cash     NUMERIC(18, 2),                      -- smena yopilganda haqiqiy naqd

    -- Smena hisoboti (yopilganda to'ldiriladi)
    total_sales      NUMERIC(18, 2)          DEFAULT 0,
    total_cash       NUMERIC(18, 2)          DEFAULT 0,
    total_card       NUMERIC(18, 2)          DEFAULT 0,
    total_transfer   NUMERIC(18, 2)          DEFAULT 0,
    total_debt       NUMERIC(18, 2)          DEFAULT 0,
    sale_count       INTEGER                 DEFAULT 0,

    opened_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMP,

    notes            TEXT,
    created_at       TIMESTAMP               DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. SALES (sotuv / savatcha)
-- ------------------------------------------------------------
CREATE TABLE sales
(
    id              BIGSERIAL PRIMARY KEY,
    reference_no    VARCHAR(50)    NOT NULL UNIQUE,  -- SAL-20250101-0001
    shift_id        BIGINT         REFERENCES shifts (id),
    cashier_id      BIGINT         REFERENCES users (id),
    seller_id       BIGINT         NOT NULL REFERENCES users (id),  -- sotuvchi
    customer_id     BIGINT         REFERENCES customers (id),
    warehouse_id    BIGINT         NOT NULL REFERENCES warehouses (id),

    status          VARCHAR(20)    NOT NULL DEFAULT 'DRAFT',
    -- DRAFT, COMPLETED, CANCELLED

    -- Summa
    subtotal        NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- chegirmadan oldin
    discount_type   VARCHAR(10),                         -- PERCENT yoki AMOUNT
    discount_value  NUMERIC(18, 2)          DEFAULT 0,
    discount_amount NUMERIC(18, 2)          DEFAULT 0,  -- haqiqiy chegirma summasi
    total_amount    NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- to'lash kerak
    paid_amount     NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- to'langan
    debt_amount     NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- qarz (nasiya)
    change_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- qaytim

    notes           TEXT,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP               DEFAULT NOW(),
    updated_at      TIMESTAMP               DEFAULT NOW(),
    created_by      BIGINT REFERENCES users (id),
    updated_by      BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 4. SALE ITEMS (sotuv tarkibi)
-- ------------------------------------------------------------
CREATE TABLE sale_items
(
    id              BIGSERIAL PRIMARY KEY,
    sale_id         BIGINT         NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    product_unit_id BIGINT         NOT NULL REFERENCES product_units (id),
    warehouse_id    BIGINT         NOT NULL REFERENCES warehouses (id),  -- qaysi ombordan

    quantity        NUMERIC(18, 3) NOT NULL,
    original_price  NUMERIC(18, 2) NOT NULL,   -- mahsulotning asl narxi
    sale_price      NUMERIC(18, 2) NOT NULL,   -- kassir o'zgartirgan narx (min_price dan past emas)
    min_price       NUMERIC(18, 2) NOT NULL,   -- o'sha paytdagi min_price (tarix uchun)

    -- Item chegirmasi
    discount_type   VARCHAR(10),               -- PERCENT yoki AMOUNT
    discount_value  NUMERIC(18, 2) DEFAULT 0,
    discount_amount NUMERIC(18, 2) DEFAULT 0,

    total_price     NUMERIC(18, 2) NOT NULL,   -- (sale_price - discount) * quantity

    created_at      TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. SALE PAYMENTS (to'lovlar — bir nechta usul)
-- ------------------------------------------------------------
CREATE TABLE sale_payments
(
    id             BIGSERIAL PRIMARY KEY,
    sale_id        BIGINT         NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    payment_method VARCHAR(20)    NOT NULL,
    -- CASH, CARD, TRANSFER, DEBT (nasiya)
    amount         NUMERIC(18, 2) NOT NULL,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. CUSTOMER DEBTS (mijoz qarzlari — nasiya)
-- ------------------------------------------------------------
CREATE TABLE customer_debts
(
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT         NOT NULL REFERENCES customers (id),
    sale_id     BIGINT         NOT NULL REFERENCES sales (id),
    amount      NUMERIC(18, 2) NOT NULL,   -- dastlabki qarz
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    is_paid     BOOLEAN        NOT NULL DEFAULT FALSE,
    due_date    DATE,
    notes       TEXT,
    created_at  TIMESTAMP               DEFAULT NOW(),
    updated_at  TIMESTAMP               DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. CUSTOMER DEBT PAYMENTS (nasiya to'lovlari tarixi)
-- ------------------------------------------------------------
CREATE TABLE customer_debt_payments
(
    id               BIGSERIAL PRIMARY KEY,
    customer_debt_id BIGINT         NOT NULL REFERENCES customer_debts (id),
    amount           NUMERIC(18, 2) NOT NULL,
    payment_method   VARCHAR(20)    NOT NULL DEFAULT 'CASH',
    notes            TEXT,
    paid_at          TIMESTAMP               DEFAULT NOW(),
    paid_by          BIGINT REFERENCES users (id),
    created_at       TIMESTAMP               DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone        ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier         ON shifts (cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status          ON shifts (status);
CREATE INDEX IF NOT EXISTS idx_sales_shift            ON sales (shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller           ON sales (seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier          ON sales (cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer         ON sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status           ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at       ON sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale        ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_unit ON sale_items (product_unit_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale     ON sale_payments (sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_debts_customer ON customer_debts (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_debts_sale    ON customer_debts (sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_debts_is_paid ON customer_debts (is_paid);