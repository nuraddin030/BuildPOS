CREATE TABLE IF NOT EXISTS categories
(
    id          BIGSERIAL    NOT NULL,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL,
    description TEXT,
    image_url   VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    position    INTEGER      NOT NULL DEFAULT 0,
    parent_id   BIGINT,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP,
    deleted_by  BIGINT,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    created_by  BIGINT,
    updated_by  BIGINT,

    CONSTRAINT pk_categories PRIMARY KEY (id),
    CONSTRAINT uq_categories_slug UNIQUE (slug),
    CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
    );

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
    ON categories (parent_id);

CREATE INDEX IF NOT EXISTS idx_categories_status
    ON categories (status);

CREATE INDEX IF NOT EXISTS idx_categories_slug
    ON categories (slug);

CREATE INDEX IF NOT EXISTS idx_categories_is_deleted
    ON categories (is_deleted);

CREATE INDEX IF NOT EXISTS idx_categories_position
    ON categories (position);