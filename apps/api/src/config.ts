import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL ?? "./parallax.sqlite",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  livekitUrl: process.env.LIVEKIT_URL ?? "",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  exaApiKey: process.env.EXA_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  ipHashSalt: process.env.IP_HASH_SALT ?? "dev-salt",
  matchTimeoutMs: parseInt(process.env.MATCH_TIMEOUT_MS ?? "30000", 10),
  violationBanThreshold: parseInt(process.env.VIOLATION_BAN_THRESHOLD ?? "3", 10),
  profileTtlSeconds: 86400,
};

export function hasLiveKit(): boolean {
  return Boolean(config.livekitUrl && config.livekitApiKey && config.livekitApiSecret);
}
