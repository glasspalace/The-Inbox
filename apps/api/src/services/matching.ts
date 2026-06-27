import { v4 as uuidv4 } from "uuid";
import type { Axis, IdeologyProfile, Topic } from "@parallax/shared";
import { oppositeScore, totalDistance } from "@parallax/shared";
import { TOPICS } from "../db/seed.js";
import { createSessionRecord } from "../db/index.js";
import { createRoomToken, generateRoomName } from "./livekit.js";

interface QueueEntry {
  queueId: string;
  sessionId: string;
  topicId: string;
  profile: IdeologyProfile;
  joinedAt: number;
  wsSend?: (data: unknown) => void;
}

const queues = new Map<string, QueueEntry[]>();
const activeSessions = new Map<string, { topicId: string; roomName: string; participants: string[] }>();

export function getTopic(topicId: string): Topic | undefined {
  return TOPICS.find((t) => t.id === topicId && t.active);
}

function getQueueKey(topicId: string): string {
  return `queue:${topicId}`;
}

function findBestOpposite(
  entry: QueueEntry,
  candidates: QueueEntry[],
  topic: Topic,
  relaxed: boolean
): QueueEntry | null {
  const axis = topic.primaryAxis as Axis;
  const myValue = entry.profile[axis];

  let best: QueueEntry | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    if (candidate.sessionId === entry.sessionId) continue;
    const theirValue = candidate.profile[axis];
    const score = oppositeScore(myValue, theirValue) + totalDistance(entry.profile, candidate.profile) * 0.1;

    if (relaxed) {
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    } else {
      const oppositeSign =
        (myValue > 10 && theirValue < -10) ||
        (myValue < -10 && theirValue > 10) ||
        Math.abs(myValue - theirValue) >= 40;

      if (oppositeSign && score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return best;
}

export interface MatchResult {
  sessionId: string;
  roomName: string;
  livekitToken: string;
  livekitUrl: string;
  topic: Topic;
  partnerSessionId: string;
}

export async function joinQueue(
  topicId: string,
  profile: IdeologyProfile,
  wsSend?: (data: unknown) => void
): Promise<{ queueId: string; matched?: MatchResult }> {
  const topic = getTopic(topicId);
  if (!topic) throw new Error("Topic not found");

  const queueId = uuidv4();
  const entry: QueueEntry = {
    queueId,
    sessionId: profile.sessionId,
    topicId,
    profile,
    joinedAt: Date.now(),
    wsSend,
  };

  const key = getQueueKey(topicId);
  const queue = queues.get(key) ?? [];

  const match = findBestOpposite(entry, queue, topic, false);
  if (match) {
    const idx = queue.indexOf(match);
    if (idx >= 0) queue.splice(idx, 1);
    queues.set(key, queue);
    const result = await createMatch(entry, match, topic);
    return { queueId, matched: result };
  }

  queue.push(entry);
  queues.set(key, queue);

  setTimeout(() => {
    tryMatchRelaxed(key, entry.queueId);
  }, 30000);

  return { queueId };
}

async function tryMatchRelaxed(queueKey: string, queueId: string): Promise<void> {
  const queue = queues.get(queueKey);
  if (!queue) return;

  const idx = queue.findIndex((e) => e.queueId === queueId);
  if (idx < 0) return;

  const entry = queue[idx];
  const topic = getTopic(entry.topicId);
  if (!topic) return;

  const match = findBestOpposite(
    entry,
    queue.filter((_, i) => i !== idx),
    topic,
    true
  );

  if (!match) {
    entry.wsSend?.({ type: "queue:timeout", topicId: entry.topicId });
    return;
  }

  const remaining = queue.filter((e) => e.queueId !== queueId && e.queueId !== match.queueId);
  queues.set(queueKey, remaining);

  const result = await createMatch(entry, match, topic);
  entry.wsSend?.({ type: "queue:matched", ...result });
  match.wsSend?.({ type: "queue:matched", ...result, partnerSessionId: entry.sessionId });
}

async function createMatch(
  a: QueueEntry,
  b: QueueEntry,
  topic: Topic
): Promise<MatchResult> {
  const sessionId = uuidv4();
  const roomName = generateRoomName(sessionId);

  await createSessionRecord(sessionId, topic.id, roomName);

  activeSessions.set(sessionId, {
    topicId: topic.id,
    roomName,
    participants: [a.sessionId, b.sessionId],
  });

  const tokenA = await createRoomToken(roomName, a.sessionId);
  const tokenB = await createRoomToken(roomName, b.sessionId);

  const payload: MatchResult = {
    sessionId,
    roomName,
    livekitToken: tokenA?.token ?? "demo-token",
    livekitUrl: tokenA?.url ?? "",
    topic,
    partnerSessionId: b.sessionId,
  };

  if (tokenB && b.wsSend) {
    b.wsSend({
      type: "queue:matched",
      sessionId,
      roomName,
      livekitToken: tokenB.token,
      livekitUrl: tokenB.url,
      topic,
      partnerSessionId: a.sessionId,
    });
  }

  return payload;
}

export function leaveQueue(queueId: string): void {
  for (const [key, queue] of queues.entries()) {
    const filtered = queue.filter((e) => e.queueId !== queueId);
    if (filtered.length !== queue.length) {
      queues.set(key, filtered);
      return;
    }
  }
}

export function registerQueueWs(queueId: string, wsSend: (data: unknown) => void): void {
  for (const queue of queues.values()) {
    const entry = queue.find((e) => e.queueId === queueId);
    if (entry) {
      entry.wsSend = wsSend;
      return;
    }
  }
}

export async function endSession(sessionId: string, reason: string): Promise<void> {
  activeSessions.delete(sessionId);
  const { endSessionRecord } = await import("../db/index.js");
  await endSessionRecord(sessionId, reason);
}

export function getActiveSession(sessionId: string) {
  return activeSessions.get(sessionId);
}
