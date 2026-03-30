-- ─────────────────────────────────────────────────────────────
-- V23: Pending Order tizimi
-- 1. sales.submitted_at ustuni
-- 2. ASSISTANT roli
-- 3. SALES_SUBMIT, SALES_APPROVE permissionlari
-- ─────────────────────────────────────────────────────────────

-- 1. submitted_at ustuni
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_sales_status_submitted ON sales (status, submitted_at);

-- 2. ASSISTANT roli
INSERT INTO roles (name)
SELECT 'ASSISTANT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ASSISTANT');

-- 3. Yangi permissionlar (SALES guruhiga)
INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
SELECT 'SALES_SUBMIT',
       'Tasdiqlashga yuborish',
       'Submit for Approval',
       'ACTION',
       (SELECT id FROM permission_groups WHERE name = 'SALES'),
       8
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'SALES_SUBMIT');

INSERT INTO permissions (name, label_uz, label_en, type, group_id, sort_order)
SELECT 'SALES_APPROVE',
       'Kutilayotgan buyurtmani tasdiqlash',
       'Approve Pending Order',
       'ACTION',
       (SELECT id FROM permission_groups WHERE name = 'SALES'),
       9
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'SALES_APPROVE');