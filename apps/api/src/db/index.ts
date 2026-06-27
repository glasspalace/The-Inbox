import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getPool();
  await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      confidence REAL NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ban_entries (
      ip_hash TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      room_name TEXT NOT NULL,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      end_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS fact_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      claim TEXT NOT NULL,
      verdict TEXT NOT NULL,
      summary TEXT NOT NULL,
      sources JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
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
    await getPool().query(
      `INSERT INTO moderation_events (session_id, type, action, confidence, payload) VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, type, action, confidence, payload ? JSON.stringify(payload) : null]
    );
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
  const result = await getPool().query(
    `INSERT INTO fact_checks (session_id, claim, verdict, summary, sources) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [sessionId, claim, verdict, summary, JSON.stringify(sources)]
  );
  return result.rows[0].id as string;
}

export async function upsertBan(ipHash: string, reason: string, expiresAt: Date | null): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO ban_entries (ip_hash, reason, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (ip_hash) DO UPDATE SET reason = $2, expires_at = $3`,
      [ipHash, reason, expiresAt]
    );
  } catch {
    // DB optional in dev
  }
}

export async function isBanned(ipHash: string): Promise<boolean> {
  try {
    const result = await getPool().query(
      `SELECT 1 FROM ban_entries WHERE ip_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [ipHash]
    );
    return result.rowCount !== null && result.rowCount > 0;
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
    await getPool().query(
      `INSERT INTO sessions (id, topic_id, room_name) VALUES ($1, $2, $3)`,
      [id, topicId, roomName]
    );
  } catch {
    // DB optional in dev
  }
}

export async function endSessionRecord(id: string, reason: string): Promise<void> {
  try {
    await getPool().query(
      `UPDATE sessions SET ended_at = NOW(), end_reason = $2 WHERE id = $1`,
      [id, reason]
    );
  } catch {
    // DB optional in dev
  }
}
