CREATE TABLE reminders (
    id          BIGSERIAL PRIMARY KEY,
    text        VARCHAR(500) NOT NULL,
    due_date    DATE,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);