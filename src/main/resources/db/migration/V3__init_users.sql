-- Rollar
CREATE TABLE roles (
                       id          BIGSERIAL PRIMARY KEY,
                       name        VARCHAR(50) NOT NULL UNIQUE,  -- OWNER, ADMIN, CASHIER, STOREKEEPER
                       created_at  TIMESTAMP DEFAULT NOW()
);

-- Foydalanuvchilar
CREATE TABLE users (
                       id          BIGSERIAL PRIMARY KEY,
                       username    VARCHAR(50) NOT NULL UNIQUE,
                       password    VARCHAR(255) NOT NULL,        -- bcrypt hash
                       full_name   VARCHAR(100),
                       role_id     BIGINT REFERENCES roles(id),
                       is_active   BOOLEAN DEFAULT TRUE,
                       created_at  TIMESTAMP DEFAULT NOW()
);

-- Standart rollar
INSERT INTO roles (name) VALUES
                             ('OWNER'),
                             ('ADMIN'),
                             ('CASHIER'),
                             ('STOREKEEPER');

-- Admin foydalanuvchi (parol: admin123)
INSERT INTO users (username, password, full_name, role_id)
VALUES (
           'admin',
           '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCiBMbPyXGGJnqIhCUBLnrS',
           'Tizim Administratori',
           2
       );