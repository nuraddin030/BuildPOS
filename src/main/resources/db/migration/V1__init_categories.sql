-- Kategoriyalar jadvali
CREATE TABLE IF NOT EXISTS categories (
                            id          BIGSERIAL PRIMARY KEY,
                            name        VARCHAR(100) NOT NULL,
                            parent_id   BIGINT REFERENCES categories(id),
                            created_at  TIMESTAMP DEFAULT NOW()
);

-- Asosiy kategoriyalar
INSERT INTO categories (name) VALUES
                                  ('Sement va ohak'),
                                  ('G''isht va blok'),
                                  ('Metall mahsulotlar'),
                                  ('Elektr materiallari'),
                                  ('Santexnika'),
                                  ('Izolyatsiya'),
                                  ('Yog''och materiallari'),
                                  ('Asbob-uskunalar');
