-- V24: product_units ga konversiya koeffitsienti va asosiy birlik belgisi qo'shish

ALTER TABLE product_units
    ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(12, 4) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_base_unit      BOOLEAN       NOT NULL DEFAULT FALSE;

-- Mavjud mahsulotlar uchun: default birlik = asosiy birlik
UPDATE product_units SET is_base_unit = TRUE WHERE is_default = TRUE;

-- Agar hech bir birlik default bo'lmagan mahsulotlar bo'lsa, birinchisini asosiy qilamiz
UPDATE product_units pu
SET is_base_unit = TRUE
WHERE pu.is_base_unit = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM product_units pu2
      WHERE pu2.product_id = pu.product_id AND pu2.is_base_unit = TRUE
  )
  AND pu.id = (
      SELECT MIN(id) FROM product_units WHERE product_id = pu.product_id
  );