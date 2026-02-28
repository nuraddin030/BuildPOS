-- ============================================================
-- V7: Professional Products Module
-- Tables: units, unit_conversions, warehouses, products,
--         product_units, product_suppliers, product_price_tiers,
--         product_price_history, warehouse_stock, stock_movements
-- ============================================================

-- ------------------------------------------------------------
-- 0. V2 dan qolgan eski jadvallarni tozalash
-- ------------------------------------------------------------
DROP TABLE IF EXISTS price_history          CASCADE;
DROP TABLE IF EXISTS product_price_tiers    CASCADE;
DROP TABLE IF EXISTS products               CASCADE;

-- ------------------------------------------------------------
-- 1. UNITS (foydalanuvchi o'zi qo'shadi)
-- ------------------------------------------------------------
CREATE TABLE units
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,            -- "Kilogram", "Dona", "Pochka"
    symbol     VARCHAR(10) NOT NULL UNIQUE,     -- "kg", "dona", "pochka"
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP            DEFAULT NOW(),
    updated_at TIMESTAMP            DEFAULT NOW(),
    created_by BIGINT REFERENCES users (id),
    updated_by BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 2. UNIT CONVERSIONS (1 pochka = 6 dona, 1 qop = 50 kg)
-- ------------------------------------------------------------
CREATE TABLE unit_conversions
(
    id           BIGSERIAL PRIMARY KEY,
    from_unit_id BIGINT         NOT NULL REFERENCES units (id),
    to_unit_id   BIGINT         NOT NULL REFERENCES units (id),
    factor       NUMERIC(18, 6) NOT NULL,       -- 1 from_unit = factor * to_unit
    created_at   TIMESTAMP DEFAULT NOW(),
    created_by   BIGINT REFERENCES users (id),

    CONSTRAINT uq_unit_conversion UNIQUE (from_unit_id, to_unit_id),
    CONSTRAINT chk_different_units CHECK (from_unit_id != to_unit_id)
    );

-- ------------------------------------------------------------
-- 3. WAREHOUSES (omborxonalar)
-- ------------------------------------------------------------
CREATE TABLE warehouses
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,           -- "Asosiy ombor", "Filial 1"
    address    VARCHAR(255),
    is_default BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP             DEFAULT NOW(),
    updated_at TIMESTAMP             DEFAULT NOW(),
    created_by BIGINT REFERENCES users (id),
    updated_by BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 4. PRODUCTS (asosiy ma'lumot — narxlar product_units da)
-- ------------------------------------------------------------

CREATE TABLE products
(
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    sku         VARCHAR(100) UNIQUE,            -- ichki kod
    image_url   VARCHAR(500),
    category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,

    -- Status
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE / INACTIVE / ARCHIVED
    -- Low stock ogohlantirish (umumiy)
    min_stock   NUMERIC(18, 3)        DEFAULT 0,

    -- Soft delete
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP,
    deleted_by  BIGINT REFERENCES users (id),

    -- Audit
    created_at  TIMESTAMP             DEFAULT NOW(),
    updated_at  TIMESTAMP             DEFAULT NOW(),
    created_by  BIGINT REFERENCES users (id),
    updated_by  BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 5. PRODUCT UNITS (har bir tovar uchun bir nechta o'lchov + narx)
-- ------------------------------------------------------------
CREATE TABLE product_units
(
    id           BIGSERIAL PRIMARY KEY,
    product_id   BIGINT         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    unit_id      BIGINT         NOT NULL REFERENCES units (id),
    is_default   BOOLEAN        NOT NULL DEFAULT FALSE,  -- asosiy o'lchov birligi

    barcode      VARCHAR(100) UNIQUE,           -- har unit uchun alohida barcode
    cost_price   NUMERIC(18, 2) NOT NULL DEFAULT 0,      -- tannarx
    sale_price   NUMERIC(18, 2) NOT NULL DEFAULT 0,      -- sotuv narxi
    min_price    NUMERIC(18, 2) NOT NULL DEFAULT 0,      -- minimal sotuv narxi

    is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP               DEFAULT NOW(),
    updated_at   TIMESTAMP               DEFAULT NOW(),
    created_by   BIGINT REFERENCES users (id),
    updated_by   BIGINT REFERENCES users (id),

    CONSTRAINT uq_product_unit UNIQUE (product_id, unit_id)
);

-- ------------------------------------------------------------
-- 6. PRODUCT SUPPLIERS (ko'p supplier → ko'p product)
-- ------------------------------------------------------------
CREATE TABLE product_suppliers
(
    id             BIGSERIAL PRIMARY KEY,
    product_id     BIGINT         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    supplier_id    BIGINT         NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
    supplier_price NUMERIC(18, 2),              -- bu supplierdan kelish narxi
    is_preferred   BOOLEAN        NOT NULL DEFAULT FALSE,   -- asosiy supplier
    notes          TEXT,
    created_at     TIMESTAMP               DEFAULT NOW(),
    created_by     BIGINT REFERENCES users (id),

    CONSTRAINT uq_product_supplier UNIQUE (product_id, supplier_id)
);

-- ------------------------------------------------------------
-- 7. PRODUCT PRICE TIERS (miqdor + rol asosida narx)
-- ------------------------------------------------------------
CREATE TABLE product_price_tiers
(
    id              BIGSERIAL PRIMARY KEY,
    product_unit_id BIGINT         NOT NULL REFERENCES product_units (id) ON DELETE CASCADE,

    -- Tur: QUANTITY (miqdorga qarab) yoki ROLE (rolga qarab)
    tier_type       VARCHAR(20)    NOT NULL,    -- QUANTITY / ROLE

    -- Miqdor asosida (tier_type = QUANTITY)
    min_quantity    NUMERIC(18, 3),             -- 10 dan
    max_quantity    NUMERIC(18, 3),             -- 50 gacha (null = cheksiz)

    -- Rol asosida (tier_type = ROLE)
    role_name       VARCHAR(50),                -- WHOLESALE, VIP, RETAIL

    price           NUMERIC(18, 2) NOT NULL,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP               DEFAULT NOW(),
    created_by      BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 8. PRODUCT PRICE HISTORY (narx o'zgarish tarixi)
-- ------------------------------------------------------------
CREATE TABLE product_price_history
(
    id              BIGSERIAL PRIMARY KEY,
    product_unit_id BIGINT         NOT NULL REFERENCES product_units (id) ON DELETE CASCADE,
    field_name      VARCHAR(50)    NOT NULL,    -- 'cost_price' / 'sale_price' / 'min_price'
    old_value       NUMERIC(18, 2) NOT NULL,
    new_value       NUMERIC(18, 2) NOT NULL,
    changed_at      TIMESTAMP               DEFAULT NOW(),
    changed_by      BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 9. WAREHOUSE STOCK (qaysi product qaysi omborda nechta)
-- ------------------------------------------------------------
CREATE TABLE warehouse_stock
(
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    BIGINT         NOT NULL REFERENCES warehouses (id),
    product_unit_id BIGINT         NOT NULL REFERENCES product_units (id) ON DELETE CASCADE,
    quantity        NUMERIC(18, 3) NOT NULL DEFAULT 0,
    min_stock       NUMERIC(18, 3)          DEFAULT 0,  -- bu ombor uchun alohida min
    updated_at      TIMESTAMP               DEFAULT NOW(),

    CONSTRAINT uq_warehouse_stock UNIQUE (warehouse_id, product_unit_id)
);

-- ------------------------------------------------------------
-- 10. STOCK MOVEMENTS (har bir kirim/chiqim/transfer)
-- ------------------------------------------------------------
CREATE TABLE stock_movements
(
    id                BIGSERIAL PRIMARY KEY,
    product_unit_id   BIGINT         NOT NULL REFERENCES product_units (id),

    movement_type     VARCHAR(30)    NOT NULL,
    -- PURCHASE_IN    — yetkazib beruvchidan kirim
    -- SALE_OUT       — sotuvdan chiqim
    -- ADJUSTMENT_IN  — qo'lda kirim (inventarizatsiya)
    -- ADJUSTMENT_OUT — qo'lda chiqim
    -- TRANSFER_OUT   — ombordan chiqim (transfer)
    -- TRANSFER_IN    — omborgа kirim (transfer)
    -- RETURN_IN      — qaytarib olish

    from_warehouse_id BIGINT REFERENCES warehouses (id),
    to_warehouse_id   BIGINT REFERENCES warehouses (id),

    quantity          NUMERIC(18, 3) NOT NULL,
    unit_price        NUMERIC(18, 2),
    total_price       NUMERIC(18, 2),

    reference_type    VARCHAR(50),              -- 'PURCHASE', 'SALE', 'TRANSFER'
    reference_id      BIGINT,                   -- purchase_id yoki sale_id

    notes             TEXT,
    moved_at          TIMESTAMP               DEFAULT NOW(),
    moved_by          BIGINT REFERENCES users (id),

    CONSTRAINT chk_transfer_warehouses CHECK (
                movement_type NOT IN ('TRANSFER_IN', 'TRANSFER_OUT')
            OR (from_warehouse_id IS NOT NULL AND to_warehouse_id IS NOT NULL)
        )
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_products_category  ON products (category_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_products_status    ON products (status)      WHERE is_deleted = FALSE;
CREATE INDEX idx_products_slug      ON products (slug);
CREATE INDEX idx_products_sku       ON products (sku)         WHERE sku IS NOT NULL;
CREATE INDEX idx_product_units_barcode     ON product_units (barcode)    WHERE barcode IS NOT NULL;
CREATE INDEX idx_product_units_product     ON product_units (product_id);
CREATE INDEX idx_warehouse_stock_warehouse ON warehouse_stock (warehouse_id);
CREATE INDEX idx_warehouse_stock_pu        ON warehouse_stock (product_unit_id);
CREATE INDEX idx_stock_movements_pu        ON stock_movements (product_unit_id);
CREATE INDEX idx_stock_movements_type      ON stock_movements (movement_type);
CREATE INDEX idx_stock_movements_at        ON stock_movements (moved_at);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default unitlar
INSERT INTO units (name, symbol, is_active)
VALUES ('Dona',          'dona', TRUE),
       ('Kilogram',      'kg',   TRUE),
       ('Litr',          'l',    TRUE),
       ('Metr',          'm',    TRUE),
       ('Kvadrat metr',  'm2',   TRUE),
       ('Gramm',         'g',    TRUE),
       ('Tonna',         't',    TRUE),
       ('Millilitr',     'ml',   TRUE);

-- Default unit conversions
INSERT INTO unit_conversions (from_unit_id, to_unit_id, factor)
VALUES (7, 2, 1000),   -- 1 tonna  = 1000 kg
       (2, 6, 1000),   -- 1 kg     = 1000 gramm
       (3, 8, 1000);   -- 1 litr   = 1000 ml

-- Default warehouse
INSERT INTO warehouses (name, is_default, is_active)
VALUES ('Asosiy ombor', TRUE, TRUE);