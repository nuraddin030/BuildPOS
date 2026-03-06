-- Exchange rates jadvali
CREATE TABLE exchange_rates (
                                id         BIGSERIAL PRIMARY KEY,
                                currency   VARCHAR(3)     NOT NULL DEFAULT 'USD',
                                rate       DECIMAL(12, 2) NOT NULL,
                                created_at TIMESTAMP,
                                created_by BIGINT REFERENCES users(id)
);

-- ProductUnit ga USD narx maydonlari
ALTER TABLE product_units
    ADD COLUMN cost_price_usd        DECIMAL(18, 2),
    ADD COLUMN sale_price_usd        DECIMAL(18, 2),
    ADD COLUMN min_price_usd         DECIMAL(18, 2),
    ADD COLUMN exchange_rate_at_save DECIMAL(12, 2);

-- Boshlang'ich kurs
INSERT INTO exchange_rates (currency, rate, created_at)
VALUES ('USD', 12700.00, NOW());