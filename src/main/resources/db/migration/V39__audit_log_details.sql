-- V39: audit_logs jadvaliga details ustun qo'shish
-- O'zgarish tafsilotlari: eski va yangi qiymatlar

ALTER TABLE audit_logs ADD COLUMN details TEXT;
