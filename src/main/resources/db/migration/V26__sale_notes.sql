-- V26: Savatcha izohlari jadvali (kim, qachon, nima)
CREATE TABLE sale_notes (
    id         BIGSERIAL PRIMARY KEY,
    sale_id    BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    sender_id  BIGINT REFERENCES users(id),
    sender_name VARCHAR(100) NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_notes_sale_id ON sale_notes(sale_id);