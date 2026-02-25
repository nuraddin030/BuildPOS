-- Mahsulotlar master katalogi
CREATE TABLE IF NOT EXISTS products (
                          id              BIGSERIAL PRIMARY KEY,
                          name            VARCHAR(200) NOT NULL,
                          category_id     BIGINT REFERENCES categories(id),
                          unit            VARCHAR(20) NOT NULL,        -- dona, kg, m, m2, m3, qop
                          barcode         VARCHAR(50) UNIQUE,
                          image_path      VARCHAR(500),                -- rasm fayl yo'li
                          sale_price      NUMERIC(15,2) NOT NULL,      -- sotuv narxi
                          min_price       NUMERIC(15,2) NOT NULL,      -- minimal narx (chegirma chegarasi)
                          min_stock       INTEGER DEFAULT 0,           -- minimal zaxira (ogohlantirish uchun)
                          is_active       BOOLEAN DEFAULT TRUE,        -- faol/arxivlangan
                          created_at      TIMESTAMP DEFAULT NOW(),
                          updated_at      TIMESTAMP DEFAULT NOW()
);

-- Narx differensiatsiya jadvali (optoviy, VIP, slab)
CREATE TABLE IF NOT EXISTS product_price_tiers (
                                     id          BIGSERIAL PRIMARY KEY,
                                     product_id  BIGINT NOT NULL REFERENCES products(id),
                                     tier_type   VARCHAR(20) NOT NULL,   -- RETAIL, WHOLESALE, VIP, SLAB
                                     min_qty     INTEGER DEFAULT 1,      -- slab uchun minimal miqdor
                                     price       NUMERIC(15,2) NOT NULL,
                                     created_at  TIMESTAMP DEFAULT NOW()
);

-- Mahsulot narx o'zgartirish tarixi
CREATE TABLE IF NOT EXISTS price_history (
                               id          BIGSERIAL PRIMARY KEY,
                               product_id  BIGINT NOT NULL REFERENCES products(id),
                               old_price   NUMERIC(15,2),
                               new_price   NUMERIC(15,2) NOT NULL,
                               changed_by  VARCHAR(100),           -- kim o'zgartirdi
                               reason      VARCHAR(300),           -- sabab
                               created_at  TIMESTAMP DEFAULT NOW()
);

-- Test mahsulotlar
INSERT INTO products (name, category_id, unit, barcode, sale_price, min_price, min_stock)
VALUES
    ('Sement M500',     1, 'qop',  '4600001000011', 85000,  72000, 20),
    ('Sement M400',     1, 'qop',  '4600001000012', 75000,  63000, 20),
    ('Qizil g''isht',   2, 'dona', '4600001000021', 1200,   950,   500),
    ('Armatura 12mm',   3, 'm',    '4600001000031', 15000,  12000, 10),
    ('Armatura 10mm',   3, 'm',    '4600001000032', 12000,  9500,  10),
    ('Mis kabel 2.5mm', 4, 'm',    '4600001000041', 18000,  14000, 50);
