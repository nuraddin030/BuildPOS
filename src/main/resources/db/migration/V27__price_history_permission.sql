-- V27: Narx tarixi ko'rish permission
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
VALUES (
    'PRICE_HISTORY_VIEW',
    'Narx tarixini ko''rish',
    'View price history',
    'ACTION',
    (SELECT id FROM permission_groups WHERE name = 'PRODUCTS'),
    5
);