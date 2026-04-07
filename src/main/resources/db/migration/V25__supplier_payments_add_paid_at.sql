-- V25: supplier_payments jadvaliga etishmayotgan ustunlar qo'shish
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS paid_by BIGINT REFERENCES users(id);