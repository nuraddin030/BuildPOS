-- ============================================================
-- V11: Employee & Permission Module
-- Tables: permission_groups, permissions, user_permissions
-- ALTER: users (add phone)
-- ============================================================

-- ------------------------------------------------------------
-- 1. ALTER users — phone qo'shish
-- ------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ------------------------------------------------------------
-- 2. PERMISSION GROUPS (guruhlar)
-- ------------------------------------------------------------
CREATE TABLE permission_groups
(
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    label_uz   VARCHAR(100) NOT NULL,
    label_en   VARCHAR(100) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP             DEFAULT NOW(),
    created_by BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 3. PERMISSIONS (ruxsatlar)
-- ------------------------------------------------------------
CREATE TABLE permissions
(
    id         BIGSERIAL PRIMARY KEY,
    group_id   BIGINT       NOT NULL REFERENCES permission_groups (id),
    name       VARCHAR(100) NOT NULL UNIQUE,
    type       VARCHAR(10)  NOT NULL,
    label_uz   VARCHAR(100) NOT NULL,
    label_en   VARCHAR(100) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP             DEFAULT NOW(),
    created_by BIGINT REFERENCES users (id)
);

-- ------------------------------------------------------------
-- 4. USER_PERMISSIONS (foydalanuvchi ruxsatlari)
-- ------------------------------------------------------------
CREATE TABLE user_permissions
(
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    permission_id BIGINT    NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    granted_at    TIMESTAMP DEFAULT NOW(),
    granted_by    BIGINT REFERENCES users (id),
    UNIQUE (user_id, permission_id)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_permissions_group           ON permissions (group_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user       ON user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions (permission_id);