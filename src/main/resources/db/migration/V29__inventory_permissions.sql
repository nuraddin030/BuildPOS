-- V29: Inventarizatsiya permissionlari

INSERT INTO permission_groups (name, label_uz, label_en, sort_order)
VALUES ('INVENTORY', 'Inventarizatsiya', 'Inventory', 90)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
VALUES
    ('INVENTORY_VIEW',   'Inventarizatsiyani ko''rish',    'View inventory',   'ACTION',
     (SELECT id FROM permission_groups WHERE name = 'INVENTORY'), 1),
    ('INVENTORY_MANAGE', 'Inventarizatsiyani boshqarish',  'Manage inventory', 'ACTION',
     (SELECT id FROM permission_groups WHERE name = 'INVENTORY'), 2);