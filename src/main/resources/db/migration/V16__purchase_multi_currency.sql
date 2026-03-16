-- V16: Purchase multi-currency support
-- USD va UZS qarzlarni alohida saqlash

ALTER TABLE purchases
    ADD COLUMN total_usd   DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN total_uzs   DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN paid_usd    DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN paid_uzs    DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN debt_usd    DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN debt_uzs    DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Mavjud ma'lumotlarni ko'chirish (hammasi UZS da edi)
UPDATE purchases SET
                     total_uzs = total_amount,
                     paid_uzs  = paid_amount,
                     debt_uzs  = debt_amount;

ALTER TABLE purchase_payments
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'UZS';