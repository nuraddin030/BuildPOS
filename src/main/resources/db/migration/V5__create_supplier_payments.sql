CREATE TABLE IF NOT EXISTS supplier_payments (
                                   id BIGSERIAL PRIMARY KEY,
                                   supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
                                   amount DECIMAL(15,2) NOT NULL,
                                   payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
                                   note VARCHAR(255),
                                   paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
                                   paid_by BIGINT REFERENCES users(id),
                                   created_at TIMESTAMP DEFAULT NOW()
);