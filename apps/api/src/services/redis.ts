import { Redis } from "ioredis";
import type { IdeologyProfile } from "@parallax/shared";
import { config } from "../config.js";

let redis: Redis | null = null;
const memoryProfiles = new Map<string, IdeologyProfile>();
const memoryViolations = new Map<string, number>();

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on("error", () => {
      // Fall back to in-memory when Redis unavailable
    });
  }
  return redis;
}

export async function saveProfile(profile: IdeologyProfile): Promise<void> {
  memoryProfiles.set(profile.sessionId, profile);
  try {
    const client = getRedis();
    await client.setex(
      `profile:${profile.sessionId}`,
      config.profileTtlSeconds,
      JSON.stringify(profile)
    );
  } catch {
    // in-memory fallback
  }
}

export async function getProfile(sessionId: string): Promise<IdeologyProfile | null> {
  const cached = memoryProfiles.get(sessionId);
  if (cached) return cached;
  try {
    const client = getRedis();
    const raw = await client.get(`profile:${sessionId}`);
    if (!raw) return null;
    const profile = JSON.parse(raw) as IdeologyProfile;
    memoryProfiles.set(sessionId, profile);
    return profile;
  } catch {
    return memoryProfiles.get(sessionId) ?? null;
  }
}

export async function incrementViolation(ipHash: string): Promise<number> {
  const memKey = `violations:${ipHash}`;
  const current = (memoryViolations.get(memKey) ?? 0) + 1;
  memoryViolations.set(memKey, current);
  try {
    const client = getRedis();
    const count = await client.incr(memKey);
    await client.expire(memKey, 86400);
    return count;
  } catch {
    return current;
  }
}

export async function getViolationCount(ipHash: string): Promise<number> {
  try {
    const client = getRedis();
    const count = await client.get(`violations:${ipHash}`);
    return count ? parseInt(count, 10) : memoryViolations.get(`violations:${ipHash}`) ?? 0;
  } catch {
    return memoryViolations.get(`violations:${ipHash}`) ?? 0;
  }
}
