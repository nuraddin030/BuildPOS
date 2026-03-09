ALTER TABLE purchase_items
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'UZS',
ADD COLUMN exchange_rate DECIMAL(18,2) NOT NULL DEFAULT 1.00,
ADD COLUMN unit_price_uzs DECIMAL(18,2); -- UZS da hisoblangan narx