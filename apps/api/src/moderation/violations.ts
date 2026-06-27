import { config } from "../config.js";
import { upsertBan } from "../db/index.js";
import { logModerationEvent } from "../db/index.js";
import { incrementViolation } from "../services/redis.js";
import type { ModerationResult } from "@parallax/shared";

export async function handleModerationViolation(
  sessionId: string,
  ipHash: string,
  type: string,
  result: ModerationResult
): Promise<{ banned: boolean; violationCount: number }> {
  if (result.action === "allow" || result.action === "warn") {
    if (result.action === "warn") {
      await logModerationEvent(sessionId, type, result.action, result.confidence, {
        reason: result.reason,
      });
    }
    return { banned: false, violationCount: 0 };
  }

  await logModerationEvent(sessionId, type, result.action, result.confidence, {
    reason: result.reason,
  });

  const violationCount = await incrementViolation(ipHash);
  let banned = false;

  if (violationCount >= config.violationBanThreshold) {
    banned = true;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await upsertBan(ipHash, "Repeated moderation violations", expiresAt);
  }

  return { banned, violationCount };
}
