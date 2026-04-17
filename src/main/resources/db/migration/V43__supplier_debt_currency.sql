-- supplier_debts jadvaliga currency ustuni qo'shish
ALTER TABLE supplier_debts ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'UZS';

-- USD qarzlari: purchase bilan bog'liq va amount = 0 bo'lgan yozuvlarni tekshirib USD ga o'tkazish
-- (yangi yozuvlar to'g'ri saqlanadi, eski legacy yozuvlar UZS bo'lib qoladi)