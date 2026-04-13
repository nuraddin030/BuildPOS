-- B-11: Audit Log jadvali
-- Kim, qachon, nima qilganini qayd etadi (sertifikat uchun zarur)
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    username    VARCHAR(50),
    action      VARCHAR(10)  NOT NULL,   -- CREATE | UPDATE | DELETE
    entity_type VARCHAR(50)  NOT NULL,   -- Sale | Product | Purchase | ...
    entity_id   BIGINT,                  -- URL dagi ID (agar mavjud bo'lsa)
    ip_address  VARCHAR(45)  NOT NULL,
    request_uri VARCHAR(500),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);