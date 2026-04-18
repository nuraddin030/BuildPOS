-- UserSession ga joriy access tokenni saqlash (force-close da blacklist qilish uchun)
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS access_token TEXT;