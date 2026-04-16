-- V38: Foydalanuvchi sessiyalari jadvali
-- Login/logout vaqti, davomiyligi va qurilma ma'lumotlari

CREATE TABLE user_sessions (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    username     VARCHAR(50)  NOT NULL,
    ip_address   VARCHAR(45)  NOT NULL,
    device       VARCHAR(200),
    login_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    logout_at    TIMESTAMP,
    duration_sec BIGINT,
    logout_type  VARCHAR(20)  -- MANUAL | TIMEOUT
);

CREATE INDEX idx_user_sessions_username ON user_sessions(username);
CREATE INDEX idx_user_sessions_login_at ON user_sessions(login_at DESC);