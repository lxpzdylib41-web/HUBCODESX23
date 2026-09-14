CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  discord_name TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_by_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warnings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  reason TEXT NOT NULL,
  warned_by TEXT NOT NULL,
  warned_by_name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keys (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL DEFAULT 'legacy',
  type TEXT NOT NULL,
  duration_minutes INTEGER,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  created_by_name TEXT,
  assigned_to TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hwid TEXT,
  ip_address TEXT,
  platform TEXT,
  device_model TEXT,
  roblox_version TEXT
);