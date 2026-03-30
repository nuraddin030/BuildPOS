-- Qisman qaytarish uchun: har bir sale_item da necha dona qaytarilganini saqlash
ALTER TABLE sale_items
    ADD COLUMN returned_quantity NUMERIC(19, 3) NOT NULL DEFAULT 0;