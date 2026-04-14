-- Telegram xabarnoma obunachilari
CREATE TABLE telegram_subscribers (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    chat_id    VARCHAR(50)  NOT NULL UNIQUE,
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    note       VARCHAR(255),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Audit log: action ustunini kengaytirish (LOGIN_SUCCESS uchun)
ALTER TABLE audit_logs
    ALTER COLUMN action TYPE VARCHAR(20);