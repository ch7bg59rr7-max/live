
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS roles(
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions(
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions(
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles(
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS channels(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_sources(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  kind TEXT NOT NULL,
  priority INT DEFAULT 1,
  status TEXT DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  last_bitrate_kbps INT,
  codecs TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channel_sources_channel ON channel_sources(channel_id);

INSERT INTO roles(name) VALUES ('admin'), ('editor'), ('operator')
ON CONFLICT DO NOTHING;

INSERT INTO permissions(key) VALUES
 ('channels.read'),('channels.write'),('sources.write'),
 ('users.read'),('users.write'),('roles.write')
ON CONFLICT DO NOTHING;
