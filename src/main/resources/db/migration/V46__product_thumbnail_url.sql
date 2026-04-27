-- Mahsulot rasmi ikki versiyada saqlanadi:
--   image_url     — 1000x1000 (modal/katta ko'rinish uchun)
--   thumbnail_url — 200x200   (jadval/card/POS uchun)
ALTER TABLE products
    ADD COLUMN thumbnail_url VARCHAR(255);

-- Eski mahsulotlar uchun thumbnail sifatida mavjud rasm ishlatiladi.
-- Yangi yuklangan mahsulotlar avtomatik ikki versiyada saqlanadi.
UPDATE products
SET thumbnail_url = image_url
WHERE image_url IS NOT NULL;