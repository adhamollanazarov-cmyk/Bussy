-- =======================================================
-- BUSSY FINTECH PLATFORM - SUPABASE POSTGRESQL SCHEMA
-- =======================================================
--
-- ⚠️ HOLAT: bu sxema hozircha ilovaga ULANMAGAN.
-- Kodda `@supabase/supabase-js` yo'q va hech qayerdan import qilinmaydi.
-- Ma'lumot faqat brauzer localStorage ida saqlanadi (lib/store/business-store.tsx).
--
-- Ulashdan oldin majburiy:
--   1. Quyidagi RLS siyosatlari qo'llanilgan bo'lishi kerak (fayl oxirida).
--      Anon kalit klientda ochiq bo'ladi — RLSsiz har bir foydalanuvchi
--      boshqalarning moliyaviy ma'lumotini o'qiy oladi.
--   2. `users` jadvali `auth.users` bilan bog'langan (pastga qarang).
-- =======================================================

-- Foydalanuvchilar profili.
-- Supabase Auth bilan integratsiya uchun `auth.users` ga bog'lanadi —
-- mustaqil `users` jadvali auth.uid() bilan mos kelmaydi.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biznes profillari jadvali
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  initial_capital NUMERIC(15, 2) DEFAULT 0,
  monthly_revenue NUMERIC(15, 2) DEFAULT 0,
  monthly_expenses NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI suhbatlar jadvali
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Yangi suhbat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Xabarlar va chaqirilgan tools natijalari
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moliyaviy profillar (ko'rsatkichlar monitoringi)
CREATE TABLE IF NOT EXISTS financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  revenue NUMERIC(15, 2) DEFAULT 0,
  expenses NUMERIC(15, 2) DEFAULT 0,
  taxes NUMERIC(15, 2) DEFAULT 0,
  loan_payment NUMERIC(15, 2) DEFAULT 0,
  profit NUMERIC(15, 2) DEFAULT 0,
  cashflow NUMERIC(15, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biznes-rejalar
CREATE TABLE IF NOT EXISTS business_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_user ON business_plans(user_id);

-- =======================================================
-- ROW LEVEL SECURITY
-- -------------------------------------------------------
-- MAJBURIY: bu moliyaviy ma'lumot. RLSsiz va klientdagi anon kalit bilan
-- istalgan foydalanuvchi boshqalarning tushumi, krediti va suhbatlarini
-- o'qiy oladi.
-- =======================================================

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plans      ENABLE ROW LEVEL SECURITY;

-- Foydalanuvchi faqat o'z profilini ko'radi va tahrirlaydi
DROP POLICY IF EXISTS users_self_access ON users;
CREATE POLICY users_self_access ON users
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_id ustuniga ega jadvallar uchun bir xil qoida
DROP POLICY IF EXISTS businesses_owner_access ON businesses;
CREATE POLICY businesses_owner_access ON businesses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS conversations_owner_access ON conversations;
CREATE POLICY conversations_owner_access ON conversations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS financial_profiles_owner_access ON financial_profiles;
CREATE POLICY financial_profiles_owner_access ON financial_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS business_plans_owner_access ON business_plans;
CREATE POLICY business_plans_owner_access ON business_plans
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Xabarlar egasi suhbat orqali aniqlanadi
DROP POLICY IF EXISTS messages_owner_access ON messages;
CREATE POLICY messages_owner_access ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- =======================================================
-- updated_at avtomatik yangilanishi
-- =======================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_profiles_updated_at ON financial_profiles;
CREATE TRIGGER trg_financial_profiles_updated_at
  BEFORE UPDATE ON financial_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =======================================================
-- DEMO MA'LUMOT
-- -------------------------------------------------------
-- Faqat lokal ishlab chiqish uchun. `auth.users` da mos yozuv bo'lishi kerak,
-- shuning uchun production migratsiyasida bu blok ishlatilmasin.
-- =======================================================
-- INSERT INTO users (id, name, email)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Tadbirkor', 'demo@bussy.uz')
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO businesses (id, user_id, name, type, location, initial_capital, monthly_revenue, monthly_expenses)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   'Fast Food Urganch', 'Fast Food', 'Urganch',
--   100000000, 45000000, 28000000
-- ) ON CONFLICT (id) DO NOTHING;
