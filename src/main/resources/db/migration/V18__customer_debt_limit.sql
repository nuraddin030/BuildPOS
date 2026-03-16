-- ─────────────────────────────────────────────────────────────
-- V18: Customer qarz limiti
-- ─────────────────────────────────────────────────────────────

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS debt_limit       NUMERIC(18,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS debt_limit_strict BOOLEAN       DEFAULT FALSE NOT NULL;