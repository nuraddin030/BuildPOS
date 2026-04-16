-- V40: audit_logs jadvaliga entity_name ustun qo'shish
-- "Product #45" o'rniga "Tsement M400" ko'rsatish uchun

ALTER TABLE audit_logs ADD COLUMN entity_name VARCHAR(200);