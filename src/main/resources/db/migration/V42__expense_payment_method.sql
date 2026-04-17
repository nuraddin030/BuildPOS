-- Expense jadvaliga to'lov usuli va yetkazuvchi bog'lanishini qo'shish
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id    BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;