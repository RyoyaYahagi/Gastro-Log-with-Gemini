-- Gastro Log - Supabase Database Setup
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- ========================================
-- 1. food_logs テーブル
-- ========================================
CREATE TABLE food_logs (
  id BIGINT PRIMARY KEY,  -- クライアント側の Date.now()
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  image TEXT,  -- base64
  memo TEXT,
  ingredients JSONB DEFAULT '[]',
  life JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own logs"
  ON food_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_created ON food_logs(user_id, created_at DESC);

-- ========================================
-- 2. medication_history テーブル
-- ========================================
CREATE TABLE medication_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own medications"
  ON medication_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 3. Updated at trigger
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_logs_updated_at
  BEFORE UPDATE ON food_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
