import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config.js";
import { initDb } from "./db/index.js";
import { registerRoutes } from "./routes/index.js";
import { registerQueueWs, joinQueue, leaveQueue } from "./services/matching.js";
import { getProfile } from "./services/redis.js";
import { hashIp, getClientIp } from "./services/ip.js";
import { isBanned } from "./db/index.js";

async function main() {
  await initDb().catch(() => {
    console.warn("Database unavailable — running with in-memory fallbacks");
  });

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(websocket);

  await registerRoutes(app);

  app.register(async (fastify) => {
    fastify.get("/ws/queue", { websocket: true }, (socket, request) => {
      let queueId: string | null = null;

      socket.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type: string;
            topicId?: string;
            sessionId?: string;
            queueId?: string;
          };

          if (msg.type === "queue:join" && msg.topicId && msg.sessionId) {
            const ip = hashIp(getClientIp(request.headers as Record<string, string | string[] | undefined>));
            if (await isBanned(ip)) {
              socket.send(JSON.stringify({ type: "error", error: "Access denied" }));
              return;
            }

            const profile = await getProfile(msg.sessionId);
            if (!profile) {
              socket.send(JSON.stringify({ type: "error", error: "Session expired" }));
              return;
            }

            const wsSend = (data: unknown) => {
              if (socket.readyState === 1) socket.send(JSON.stringify(data));
            };

            const result = await joinQueue(msg.topicId, profile, wsSend);
            queueId = result.queueId;

            if (result.matched) {
              socket.send(JSON.stringify({ type: "queue:matched", ...result.matched }));
            } else {
              registerQueueWs(result.queueId, wsSend);
              socket.send(JSON.stringify({ type: "queue:waiting", queueId: result.queueId }));
            }
          }

          if (msg.type === "queue:leave" && msg.queueId) {
            leaveQueue(msg.queueId);
            queueId = null;
          }
        } catch (err) {
          socket.send(JSON.stringify({ type: "error", error: String(err) }));
        }
      });

      socket.on("close", () => {
        if (queueId) leaveQueue(queueId);
      });
    });
  });

  await app.listen({ port: config.port, host: config.host });
  console.log(`Parallax API listening on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
