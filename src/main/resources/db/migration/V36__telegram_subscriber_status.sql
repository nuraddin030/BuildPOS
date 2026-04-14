ALTER TABLE telegram_subscribers
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);

-- Mavjud yozuvlar ACTIVE bo'lib qoladi (DEFAULT 'ACTIVE')