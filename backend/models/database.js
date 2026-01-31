import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import bcrypt from 'bcrypt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, '../../data/tunnels.db');

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used INTEGER
  );

  CREATE TABLE IF NOT EXISTS tunnels (
    id TEXT PRIMARY KEY,
    port INTEGER NOT NULL,
    subdomain TEXT,
    url TEXT,
    auth_profile_id TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    closed_at INTEGER,
    FOREIGN KEY (auth_profile_id) REFERENCES auth_profiles(id)
  );

  CREATE TABLE IF NOT EXISTS tunnel_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tunnel_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (tunnel_id) REFERENCES tunnels(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tunnels_status ON tunnels(status);
  CREATE INDEX IF NOT EXISTS idx_tunnel_logs_tunnel_id ON tunnel_logs(tunnel_id);
  CREATE INDEX IF NOT EXISTS idx_auth_profiles_name ON auth_profiles(name);
`);

// Prepared statements for auth profiles
const createAuthProfile = db.prepare(`
  INSERT INTO auth_profiles (id, name, username, password_hash, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const getAuthProfile = db.prepare(`
  SELECT * FROM auth_profiles WHERE id = ?
`);

const getAuthProfileByName = db.prepare(`
  SELECT * FROM auth_profiles WHERE name = ?
`);

const getAllAuthProfiles = db.prepare(`
  SELECT id, name, username, created_at, last_used FROM auth_profiles
  ORDER BY created_at DESC
`);

const deleteAuthProfile = db.prepare(`
  DELETE FROM auth_profiles WHERE id = ?
`);

const updateAuthProfileLastUsed = db.prepare(`
  UPDATE auth_profiles SET last_used = ? WHERE id = ?
`);

// Prepared statements for tunnels
const createTunnel = db.prepare(`
  INSERT INTO tunnels (id, port, subdomain, url, auth_profile_id, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getTunnel = db.prepare(`
  SELECT * FROM tunnels WHERE id = ?
`);

const getActiveTunnels = db.prepare(`
  SELECT t.*, a.name as auth_profile_name, a.username as auth_username
  FROM tunnels t
  LEFT JOIN auth_profiles a ON t.auth_profile_id = a.id
  WHERE t.status = 'active'
  ORDER BY t.created_at DESC
`);

const updateTunnelStatus = db.prepare(`
  UPDATE tunnels SET status = ?, closed_at = ? WHERE id = ?
`);

const updateTunnelUrl = db.prepare(`
  UPDATE tunnels SET url = ? WHERE id = ?
`);

// Prepared statements for logs
const createLog = db.prepare(`
  INSERT INTO tunnel_logs (tunnel_id, event_type, message, timestamp)
  VALUES (?, ?, ?, ?)
`);

const getTunnelLogs = db.prepare(`
  SELECT * FROM tunnel_logs
  WHERE tunnel_id = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

// Database operations with error handling
export const authProfileOps = {
  async create(id, name, username, password) {
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const createdAt = Date.now();
      createAuthProfile.run(id, name, username, passwordHash, createdAt);
      return { id, name, username, created_at: createdAt };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('An auth profile with this name already exists');
      }
      throw error;
    }
  },

  get(id) {
    return getAuthProfile.get(id);
  },

  getByName(name) {
    return getAuthProfileByName.get(name);
  },

  getAll() {
    return getAllAuthProfiles.all();
  },

  delete(id) {
    const result = deleteAuthProfile.run(id);
    return result.changes > 0;
  },

  updateLastUsed(id) {
    updateAuthProfileLastUsed.run(Date.now(), id);
  },

  async verifyPassword(profileId, password) {
    const profile = getAuthProfile.get(profileId);
    if (!profile) return false;
    return bcrypt.compare(password, profile.password_hash);
  }
};

export const tunnelOps = {
  create(id, port, subdomain, authProfileId) {
    const createdAt = Date.now();
    createTunnel.run(id, port, subdomain, null, authProfileId, 'active', createdAt);
    return { id, port, subdomain, auth_profile_id: authProfileId, status: 'active', created_at: createdAt };
  },

  get(id) {
    return getTunnel.get(id);
  },

  getActive() {
    return getActiveTunnels.all();
  },

  updateStatus(id, status) {
    const closedAt = status === 'closed' ? Date.now() : null;
    updateTunnelStatus.run(status, closedAt, id);
  },

  updateUrl(id, url) {
    updateTunnelUrl.run(url, id);
  }
};

export const logOps = {
  create(tunnelId, eventType, message) {
    createLog.run(tunnelId, eventType, message, Date.now());
  },

  getForTunnel(tunnelId, limit = 50) {
    return getTunnelLogs.all(tunnelId, limit);
  }
};

export default db;
