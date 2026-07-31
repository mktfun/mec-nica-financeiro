-- Add bot_url and bot_api_key to ai_settings

ALTER TABLE ai_settings
ADD COLUMN IF NOT EXISTS bot_url TEXT DEFAULT 'https://bot.tork.services',
ADD COLUMN IF NOT EXISTS bot_api_key TEXT;

NOTIFY pgrst, 'reload schema';
