import { createHash } from "crypto";
import { config } from "../config.js";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${config.ipHashSalt}`).digest("hex");
}

export function getClientIp(headers: Record<string, string | string[] | undefined>, fallback = "127.0.0.1"): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? fallback;
  }
  return fallback;
}
