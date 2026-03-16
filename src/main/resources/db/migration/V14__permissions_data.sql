-- ─────────────────────────────────────────────────────────────
-- V14: Permission guruhlar va permissionlar
-- ─────────────────────────────────────────────────────────────

-- Permission Groups
INSERT INTO permission_groups (name, label_uz, label_en, sort_order) VALUES
                                                                         ('PRODUCTS',        'Mahsulotlar',      'Products',       1),
                                                                         ('CATEGORIES',      'Kategoriyalar',    'Categories',     2),
                                                                         ('UNITS',           'O''lchov birligi', 'Units',          3),
                                                                         ('WAREHOUSES',      'Omborlar',         'Warehouses',     4),
                                                                         ('CUSTOMERS',       'Mijozlar',         'Customers',      5),
                                                                         ('SUPPLIERS',       'Yetkazuvchilar',   'Suppliers',      6),
                                                                         ('PARTNERS',        'Hamkorlar',        'Partners',       7),
                                                                         ('PURCHASES',       'Xaridlar',         'Purchases',      8),
                                                                         ('SALES',           'Sotuvlar',         'Sales',          9),
                                                                         ('STOCK_MOVEMENTS', 'Sklad harakati',   'Stock Movements',10),
                                                                         ('EMPLOYEES',       'Xodimlar',         'Employees',      11),
                                                                         ('REPORTS',         'Hisobotlar',       'Reports',        12),
                                                                         ('DASHBOARD',       'Bosh sahifa',      'Dashboard',      13);

-- ── PRODUCTS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('PRODUCTS_VIEW',   'Ko''rish',     'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='PRODUCTS'), 1),
                                                                                   ('PRODUCTS_CREATE', 'Qo''shish',   'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='PRODUCTS'), 2),
                                                                                   ('PRODUCTS_EDIT',   'Tahrirlash',  'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='PRODUCTS'), 3),
                                                                                   ('PRODUCTS_DELETE', 'O''chirish',  'Delete', 'ACTION', (SELECT id FROM permission_groups WHERE name='PRODUCTS'), 4);

-- ── CATEGORIES ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('CATEGORIES_VIEW',   'Ko''rish',    'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='CATEGORIES'), 1),
                                                                                   ('CATEGORIES_CREATE', 'Qo''shish',  'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='CATEGORIES'), 2),
                                                                                   ('CATEGORIES_EDIT',   'Tahrirlash', 'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='CATEGORIES'), 3),
                                                                                   ('CATEGORIES_DELETE', 'O''chirish', 'Delete', 'ACTION', (SELECT id FROM permission_groups WHERE name='CATEGORIES'), 4);

-- ── UNITS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('UNITS_VIEW',   'Ko''rish',    'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='UNITS'), 1),
                                                                                   ('UNITS_CREATE', 'Qo''shish',  'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='UNITS'), 2),
                                                                                   ('UNITS_EDIT',   'Tahrirlash', 'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='UNITS'), 3),
                                                                                   ('UNITS_DELETE', 'O''chirish', 'Delete', 'ACTION', (SELECT id FROM permission_groups WHERE name='UNITS'), 4);

-- ── WAREHOUSES ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('WAREHOUSES_VIEW',   'Ko''rish',    'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='WAREHOUSES'), 1),
                                                                                   ('WAREHOUSES_CREATE', 'Qo''shish',  'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='WAREHOUSES'), 2),
                                                                                   ('WAREHOUSES_EDIT',   'Tahrirlash', 'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='WAREHOUSES'), 3),
                                                                                   ('WAREHOUSES_DELETE', 'O''chirish', 'Delete', 'ACTION', (SELECT id FROM permission_groups WHERE name='WAREHOUSES'), 4);

-- ── CUSTOMERS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('CUSTOMERS_VIEW',       'Ko''rish',        'View',       'PAGE',   (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 1),
                                                                                   ('CUSTOMERS_CREATE',     'Qo''shish',      'Create',     'ACTION', (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 2),
                                                                                   ('CUSTOMERS_EDIT',       'Tahrirlash',     'Edit',       'ACTION', (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 3),
                                                                                   ('CUSTOMERS_DELETE',     'O''chirish',     'Delete',     'ACTION', (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 4),
                                                                                   ('CUSTOMERS_DEBT_VIEW',  'Qarzlarni ko''rish', 'View Debts', 'ACTION', (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 5),
                                                                                   ('CUSTOMERS_DEBT_PAY',   'Qarz to''lash',  'Pay Debt',   'ACTION', (SELECT id FROM permission_groups WHERE name='CUSTOMERS'), 6);

-- ── SUPPLIERS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('SUPPLIERS_VIEW',      'Ko''rish',        'View',      'PAGE',   (SELECT id FROM permission_groups WHERE name='SUPPLIERS'), 1),
                                                                                   ('SUPPLIERS_CREATE',    'Qo''shish',      'Create',    'ACTION', (SELECT id FROM permission_groups WHERE name='SUPPLIERS'), 2),
                                                                                   ('SUPPLIERS_EDIT',      'Tahrirlash',     'Edit',      'ACTION', (SELECT id FROM permission_groups WHERE name='SUPPLIERS'), 3),
                                                                                   ('SUPPLIERS_DELETE',    'O''chirish',     'Delete',    'ACTION', (SELECT id FROM permission_groups WHERE name='SUPPLIERS'), 4),
                                                                                   ('SUPPLIERS_DEBT_VIEW', 'Qarzlarni ko''rish', 'View Debts', 'ACTION', (SELECT id FROM permission_groups WHERE name='SUPPLIERS'), 5);

-- ── PARTNERS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('PARTNERS_VIEW',   'Ko''rish',    'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='PARTNERS'), 1),
                                                                                   ('PARTNERS_CREATE', 'Qo''shish',  'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='PARTNERS'), 2),
                                                                                   ('PARTNERS_EDIT',   'Tahrirlash', 'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='PARTNERS'), 3),
                                                                                   ('PARTNERS_DELETE', 'O''chirish', 'Delete', 'ACTION', (SELECT id FROM permission_groups WHERE name='PARTNERS'), 4);

-- ── PURCHASES ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('PURCHASES_VIEW',    'Ko''rish',      'View',    'PAGE',   (SELECT id FROM permission_groups WHERE name='PURCHASES'), 1),
                                                                                   ('PURCHASES_CREATE',  'Qo''shish',    'Create',  'ACTION', (SELECT id FROM permission_groups WHERE name='PURCHASES'), 2),
                                                                                   ('PURCHASES_EDIT',    'Tahrirlash',   'Edit',    'ACTION', (SELECT id FROM permission_groups WHERE name='PURCHASES'), 3),
                                                                                   ('PURCHASES_DELETE',  'O''chirish',   'Delete',  'ACTION', (SELECT id FROM permission_groups WHERE name='PURCHASES'), 4),
                                                                                   ('PURCHASES_RECEIVE', 'Qabul qilish', 'Receive', 'ACTION', (SELECT id FROM permission_groups WHERE name='PURCHASES'), 5),
                                                                                   ('PURCHASES_PAY',     'To''lash',     'Pay',     'ACTION', (SELECT id FROM permission_groups WHERE name='PURCHASES'), 6);

-- ── SALES ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('SALES_VIEW',         'Ko''rish',        'View',         'PAGE',   (SELECT id FROM permission_groups WHERE name='SALES'), 1),
                                                                                   ('SALES_CREATE',       'Sotuv qilish',    'Create Sale',  'ACTION', (SELECT id FROM permission_groups WHERE name='SALES'), 2),
                                                                                   ('SALES_CANCEL',       'Bekor qilish',    'Cancel',       'ACTION', (SELECT id FROM permission_groups WHERE name='SALES'), 3),
                                                                                   ('SALES_SHIFT_OPEN',   'Smena ochish',    'Open Shift',   'ACTION', (SELECT id FROM permission_groups WHERE name='SALES'), 4),
                                                                                   ('SALES_SHIFT_CLOSE',  'Smena yopish',    'Close Shift',  'ACTION', (SELECT id FROM permission_groups WHERE name='SALES'), 5),
                                                                                   ('SALES_DEBT',         'Nasiya berish',   'Give Debt',    'ACTION', (SELECT id FROM permission_groups WHERE name='SALES'), 6);

-- ── STOCK MOVEMENTS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('STOCK_VIEW',     'Ko''rish',     'View',     'PAGE',   (SELECT id FROM permission_groups WHERE name='STOCK_MOVEMENTS'), 1),
                                                                                   ('STOCK_ADJUST',   'Kirim/Chiqim', 'Adjust',   'ACTION', (SELECT id FROM permission_groups WHERE name='STOCK_MOVEMENTS'), 2),
                                                                                   ('STOCK_TRANSFER', 'O''tkazish',   'Transfer', 'ACTION', (SELECT id FROM permission_groups WHERE name='STOCK_MOVEMENTS'), 3);

-- ── EMPLOYEES ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('EMPLOYEES_VIEW',   'Ko''rish',    'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='EMPLOYEES'), 1),
                                                                                   ('EMPLOYEES_CREATE', 'Qo''shish',  'Create', 'ACTION', (SELECT id FROM permission_groups WHERE name='EMPLOYEES'), 2),
                                                                                   ('EMPLOYEES_EDIT',   'Tahrirlash', 'Edit',   'ACTION', (SELECT id FROM permission_groups WHERE name='EMPLOYEES'), 3),
                                                                                   ('EMPLOYEES_PERMS',  'Ruxsat berish', 'Grant Permissions', 'ACTION', (SELECT id FROM permission_groups WHERE name='EMPLOYEES'), 4);

-- ── REPORTS ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
                                                                                   ('REPORTS_VIEW',  'Ko''rish',   'View',   'PAGE',   (SELECT id FROM permission_groups WHERE name='REPORTS'), 1),
                                                                                   ('REPORTS_EXPORT','Eksport',    'Export', 'ACTION', (SELECT id FROM permission_groups WHERE name='REPORTS'), 2);

-- ── DASHBOARD ──
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order) VALUES
    ('DASHBOARD_VIEW', 'Ko''rish', 'View', 'PAGE', (SELECT id FROM permission_groups WHERE name='DASHBOARD'), 1);
