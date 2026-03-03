-- ============================================================
-- V12: Dashboard tayyorlash
-- 1. customer_debts ga due_date qo'shish
-- ============================================================

ALTER TABLE customer_debts
    ADD COLUMN IF NOT EXISTS due_date DATE;

-- Indeks — muddati o'tganlarni tez topish uchun
CREATE INDEX IF NOT EXISTS idx_customer_debts_due_date ON customer_debts (due_date);