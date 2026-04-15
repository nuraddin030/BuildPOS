-- Harajat kategoriyalari
CREATE TABLE expense_categories (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Standart kategoriyalar
INSERT INTO expense_categories (name) VALUES
    ('Tushlik'),
    ('Benzin'),
    ('Kommunal'),
    ('Ijara'),
    ('Boshqa');

-- Harajatlar
CREATE TABLE expenses (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE         NOT NULL DEFAULT CURRENT_DATE,
    category_id BIGINT       REFERENCES expense_categories(id) ON DELETE SET NULL,
    amount      NUMERIC(18,2) NOT NULL,
    note        VARCHAR(500),
    created_by  BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    shift_id    BIGINT       REFERENCES shifts(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);