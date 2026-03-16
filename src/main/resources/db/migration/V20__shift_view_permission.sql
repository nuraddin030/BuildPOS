-- V20__shift_view_permission.sql
-- SHIFTS permission guruhi va SHIFT_VIEW permission qo'shish

-- 1. Guruh qo'shish (agar yo'q bo'lsa)
INSERT INTO permission_groups (name, label_uz, label_en, sort_order)
SELECT 'SHIFTS', 'Smenalar', 'Shifts', 90
    WHERE NOT EXISTS (SELECT 1 FROM permission_groups WHERE name = 'SHIFTS');

-- 2. Permission qo'shish
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
VALUES (
           'SHIFT_VIEW',
           'Smena hisobotlarini ko''rish',
           'View Shift Reports',
           'PAGE',
           (SELECT id FROM permission_groups WHERE name = 'SHIFTS'),
           1
       );