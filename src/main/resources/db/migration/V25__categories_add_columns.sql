-- V25: categories jadvaliga etishmayotgan ustunlar qo'shish
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_by BIGINT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_by BIGINT;

ALTER TABLE categories ADD CONSTRAINT IF NOT EXISTS uq_categories_slug UNIQUE (slug);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories (status);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON categories (is_deleted);
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories (position);
