-- V28: Inventarizatsiya (revision) moduli

CREATE TABLE inventory_sessions (
    id               BIGSERIAL PRIMARY KEY,
    warehouse_id     BIGINT       NOT NULL REFERENCES warehouses(id),
    warehouse_name   VARCHAR(200) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',  -- DRAFT | COMPLETED
    notes            TEXT,
    created_by_id    BIGINT REFERENCES users(id),
    created_by_name  VARCHAR(100),
    completed_by_id  BIGINT REFERENCES users(id),
    completed_by_name VARCHAR(100),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMP
);

CREATE TABLE inventory_items (
    id               BIGSERIAL PRIMARY KEY,
    session_id       BIGINT        NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    product_unit_id  BIGINT        NOT NULL REFERENCES product_units(id),
    product_name     VARCHAR(500)  NOT NULL,
    unit_symbol      VARCHAR(20)   NOT NULL,
    system_qty       DECIMAL(18,3) NOT NULL DEFAULT 0,
    actual_qty       DECIMAL(18,3),
    notes            VARCHAR(500)
);

CREATE INDEX idx_inventory_items_session ON inventory_items(session_id);