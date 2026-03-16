-- ─────────────────────────────────────────────────────────────
-- V19: Customer debt installment (to'lov jadvali)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_debt_installments (
                                                          id                  BIGSERIAL PRIMARY KEY,
                                                          customer_debt_id    BIGINT        NOT NULL REFERENCES customer_debts(id) ON DELETE CASCADE,
    installment_number  INT           NOT NULL,
    due_date            DATE          NOT NULL,
    amount              NUMERIC(18,2) NOT NULL,
    paid_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
    is_paid             BOOLEAN       NOT NULL DEFAULT FALSE,
    paid_at             TIMESTAMP,
    notes               TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_debt_installment UNIQUE (customer_debt_id, installment_number)
    );

CREATE INDEX IF NOT EXISTS idx_installments_debt_id  ON customer_debt_installments(customer_debt_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON customer_debt_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_is_paid  ON customer_debt_installments(is_paid);