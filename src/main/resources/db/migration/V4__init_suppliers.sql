-- Yetkazib beruvchilar
CREATE TABLE IF NOT EXISTS suppliers (
                                         id              BIGSERIAL PRIMARY KEY,
                                         name            VARCHAR(200) NOT NULL,
    company         VARCHAR(200),
    phone           VARCHAR(20),
    address         VARCHAR(300),
    bank_account    VARCHAR(50),
    inn             VARCHAR(20),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
    );

-- Yetkazuvchi — mahsulot bog'liq (qaysi yetkazuvchi qaysi mahsulotni beradi)
CREATE TABLE IF NOT EXISTS supplier_products (
                                                 id              BIGSERIAL PRIMARY KEY,
                                                 supplier_id     BIGINT NOT NULL REFERENCES suppliers(id),
    product_id      BIGINT NOT NULL REFERENCES products(id),
    last_price      NUMERIC(15,2),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(supplier_id, product_id)
    );

-- Yetkazuvchiga qarz
CREATE TABLE IF NOT EXISTS supplier_debts (
                                              id              BIGSERIAL PRIMARY KEY,
                                              supplier_id     BIGINT NOT NULL REFERENCES suppliers(id),
    amount          NUMERIC(15,2) NOT NULL,
    paid_amount     NUMERIC(15,2) DEFAULT 0,
    due_date        DATE,
    is_paid         BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
    );

-- Yetkazuvchiga to'lov tarixi
CREATE TABLE IF NOT EXISTS supplier_payments (
                                                 id              BIGSERIAL PRIMARY KEY,
                                                 supplier_id     BIGINT NOT NULL REFERENCES suppliers(id),
    debt_id         BIGINT REFERENCES supplier_debts(id),
    amount          NUMERIC(15,2) NOT NULL,
    payment_method  VARCHAR(20) DEFAULT 'CASH',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
    );

-- Test ma'lumotlar
INSERT INTO suppliers (name, company, phone, address) VALUES
                                                          ('Akbar Toshmatov', 'Toshkent Qurilish OAJ', '+998901234567', 'Toshkent, Yunusobod'),
                                                          ('Sardor Rahimov', 'MetallTrade LLC', '+998901234568', 'Toshkent, Chilonzor'),
                                                          ('Umid Karimov', 'ElektrMontaj', '+998901234569', 'Toshkent, Mirzo Ulugbek');