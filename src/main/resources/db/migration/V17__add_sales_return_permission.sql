-- ─────────────────────────────────────────────────────────────
-- V17: SALES_RETURN permission qo'shish
-- ─────────────────────────────────────────────────────────────

INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
VALUES (
           'SALES_RETURN',
           'Qaytarish',
           'Return Sale',
           'ACTION',
           (SELECT id FROM permission_groups WHERE name = 'SALES'),
           7
       );