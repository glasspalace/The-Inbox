import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.databaseUrl);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export async function initDb(): Promise<void> {
  const sqlite = getDb();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      confidence REAL NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS ban_entries (
      ip_hash TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      room_name TEXT NOT NULL,
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      ended_at INTEGER,
      end_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS fact_checks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      claim TEXT NOT NULL,
      verdict TEXT NOT NULL,
      summary TEXT NOT NULL,
      sources TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

export async function logModerationEvent(
  sessionId: string,
  type: string,
  action: string,
  confidence: number,
  payload?: unknown
): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO moderation_events (id, session_id, type, action, confidence, payload) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(randomUUID(), sessionId, type, action, confidence, payload ? JSON.stringify(payload) : null);
  } catch {
    // DB optional in dev without docker
  }
}

export async function saveFactCheck(
  sessionId: string,
  claim: string,
  verdict: string,
  summary: string,
  sources: unknown[]
): Promise<string> {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO fact_checks (id, session_id, claim, verdict, summary, sources) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, sessionId, claim, verdict, summary, JSON.stringify(sources));
  return id;
}

export async function upsertBan(ipHash: string, reason: string, expiresAt: Date | null): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO ban_entries (ip_hash, reason, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(ip_hash) DO UPDATE SET reason = excluded.reason, expires_at = excluded.expires_at`
      )
      .run(ipHash, reason, expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null);
  } catch {
    // DB optional in dev
  }
}

export async function isBanned(ipHash: string): Promise<boolean> {
  try {
    const result = getDb()
      .prepare(
        `SELECT 1 FROM ban_entries WHERE ip_hash = ? AND (expires_at IS NULL OR expires_at > unixepoch()) LIMIT 1`
      )
      .get(ipHash);
    return Boolean(result);
  } catch {
    return false;
  }
}

export async function createSessionRecord(
  id: string,
  topicId: string,
  roomName: string
): Promise<void> {
  try {
    getDb().prepare(`INSERT INTO sessions (id, topic_id, room_name) VALUES (?, ?, ?)`).run(id, topicId, roomName);
  } catch {
    // DB optional in dev
  }
}

export async function endSessionRecord(id: string, reason: string): Promise<void> {
  try {
    getDb().prepare(`UPDATE sessions SET ended_at = unixepoch(), end_reason = ? WHERE id = ?`).run(reason, id);
  } catch {
    // DB optional in dev
  }
}
