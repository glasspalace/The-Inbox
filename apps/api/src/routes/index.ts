import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { computeProfile } from "@parallax/shared";
import { SURVEY_QUESTIONS, TOPICS } from "../db/seed.js";
import { getProfile, saveProfile } from "../services/redis.js";
import { joinQueue, leaveQueue, endSession, getActiveSession } from "../services/matching.js";
import { getClientIp, hashIp } from "../services/ip.js";
import { isBanned } from "../db/index.js";
import { moderateText, moderateImage } from "../moderation/text.js";
import { handleModerationViolation } from "../moderation/violations.js";
import { processMessageForFactCheck } from "../factcheck/exa.js";
import { config } from "../config.js";
import type { LikertAnswer } from "@parallax/shared";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok", service: "parallax-api" }));

  app.get("/survey/questions", async () => ({
    questions: SURVEY_QUESTIONS.filter((q) => q.active),
  }));

  app.post<{
    Body: { answers: Array<{ questionId: string; value: number }> };
  }>("/survey/submit", async (request, reply) => {
    const ip = hashIp(getClientIp(request.headers));
    if (await isBanned(ip)) {
      return reply.status(403).send({ error: "Access denied" });
    }

    const { answers } = request.body;
    if (!answers?.length) {
      return reply.status(400).send({ error: "Answers required" });
    }

    const typedAnswers = answers.map((a) => ({
      questionId: a.questionId,
      value: a.value as LikertAnswer,
    }));

    const scores = computeProfile(SURVEY_QUESTIONS, typedAnswers);
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.profileTtlSeconds * 1000);

    const profile = {
      sessionId,
      ...scores,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await saveProfile(profile);

    return {
      sessionId,
      profile: scores,
    };
  });

  app.get<{ Querystring: { sessionId?: string } }>("/survey/profile", async (request, reply) => {
    const { sessionId } = request.query;
    if (!sessionId) return reply.status(400).send({ error: "sessionId required" });
    const profile = await getProfile(sessionId);
    if (!profile) return reply.status(404).send({ error: "Profile not found or expired" });
    return { profile };
  });

  app.get("/topics", async () => ({
    topics: TOPICS.filter((t) => t.active),
  }));

  app.post<{
    Body: { topicId: string; sessionId: string; queueId?: string };
  }>("/queue/join", async (request, reply) => {
    const ip = hashIp(getClientIp(request.headers));
    if (await isBanned(ip)) {
      return reply.status(403).send({ error: "Access denied" });
    }

    const { topicId, sessionId } = request.body;
    if (!topicId || !sessionId) {
      return reply.status(400).send({ error: "topicId and sessionId required" });
    }

    const profile = await getProfile(sessionId);
    if (!profile) {
      return reply.status(404).send({ error: "Session expired — retake survey" });
    }

    const result = await joinQueue(topicId, profile);
    return result;
  });

  app.post<{ Body: { queueId: string } }>("/queue/leave", async (request) => {
    leaveQueue(request.body.queueId);
    return { ok: true };
  });

  app.post<{ Body: { sessionId: string; reason?: string } }>("/session/skip", async (request) => {
    await endSession(request.body.sessionId, request.body.reason ?? "skip");
    return { ok: true };
  });

  app.post<{ Body: { sessionId: string; reason?: string } }>("/session/report", async (request) => {
    await endSession(request.body.sessionId, "report");
    return { ok: true };
  });

  app.post<{
    Body: { sessionId: string; text: string; senderId: string };
  }>("/moderate/text", async (request, reply) => {
    const ip = hashIp(getClientIp(request.headers));
    const { sessionId, text, senderId } = request.body;

    const result = await moderateText(text);
    const { banned, violationCount } = await handleModerationViolation(
      sessionId,
      ip,
      "text",
      result
    );

    if (banned) {
      await endSession(sessionId, "moderation");
      return {
        allowed: false,
        action: "end_session",
        reason: "Banned due to repeated violations",
        banned: true,
        violationCount,
      };
    }

    if (result.action === "block") {
      return {
        allowed: false,
        action: result.action,
        reason: result.reason,
        violationCount,
      };
    }

    if (result.action === "end_session") {
      await endSession(sessionId, "moderation");
      return {
        allowed: false,
        action: result.action,
        reason: result.reason,
        violationCount,
      };
    }

    let factCheck = null;
    if (result.action === "allow") {
      factCheck = await processMessageForFactCheck(sessionId, text);
    }

    return {
      allowed: true,
      action: result.action,
      reason: result.reason,
      senderId,
      factCheck,
    };
  });

  app.post<{
    Body: { sessionId: string; imageBase64: string };
  }>("/moderate/frame", async (request, reply) => {
    const ip = hashIp(getClientIp(request.headers));
    const { sessionId, imageBase64 } = request.body;

    const result = await moderateImage(imageBase64);
    const { banned, violationCount } = await handleModerationViolation(
      sessionId,
      ip,
      "video_frame",
      result
    );

    if (banned) {
      await endSession(sessionId, "moderation");
      return {
        action: "end_session",
        reason: "Banned due to repeated violations",
        banned: true,
        violationCount,
      };
    }

    if (result.action === "end_session") {
      await endSession(sessionId, "moderation");
    }

    return { action: result.action, reason: result.reason, violationCount };
  });

  app.post<{ Body: { sessionId: string; text: string } }>("/factcheck", async (request, reply) => {
    const { sessionId, text } = request.body;
    if (!sessionId || !text) {
      return reply.status(400).send({ error: "sessionId and text required" });
    }

    const factCheck = await processMessageForFactCheck(sessionId, text);
    if (!factCheck) {
      return reply.status(204).send();
    }
    return factCheck;
  });

  app.get<{ Params: { sessionId: string } }>("/session/:sessionId", async (request, reply) => {
    const session = getActiveSession(request.params.sessionId);
    if (!session) return reply.status(404).send({ error: "Session not found" });
    return session;
  });

  app.post<{ Body: { sessionId: string; score: number } }>("/session/feedback", async (request) => {
    return { ok: true, sessionId: request.body.sessionId, score: request.body.score };
  });
}
