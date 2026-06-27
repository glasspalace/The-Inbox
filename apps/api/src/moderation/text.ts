import OpenAI from "openai";
import type { ModerationResult } from "@parallax/shared";
import { config } from "../config.js";

const BLOCKLIST = [
  /\b(kill yourself|kys)\b/i,
  /\b(n[i1]gg[ae]r|f[a4]ggot)\b/i,
  /\b(r[a4]pe)\s+(you|u)\b/i,
];

const client = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export async function moderateText(text: string): Promise<ModerationResult> {
  for (const pattern of BLOCKLIST) {
    if (pattern.test(text)) {
      return { action: "block", confidence: 0.95, reason: "Blocked content detected" };
    }
  }

  if (!client) {
    return { action: "allow", confidence: 1 };
  }

  try {
    const result = await client.moderations.create({ input: text });
    const scores = result.results[0];
    if (!scores) return { action: "allow", confidence: 1 };

    if (scores.flagged) {
      const severe =
        scores.category_scores["sexual/minors"] > 0.5 ||
        scores.category_scores["violence"] > 0.8 ||
        scores.category_scores["hate"] > 0.8 ||
        scores.category_scores["harassment/threatening"] > 0.7;

      return {
        action: severe ? "block" : "warn",
        confidence: 0.9,
        reason: "Content flagged by moderation API",
      };
    }

    return { action: "allow", confidence: 0.95 };
  } catch {
    return { action: "allow", confidence: 0.5 };
  }
}

export async function moderateImage(base64Image: string): Promise<ModerationResult> {
  if (!client) {
    return { action: "allow", confidence: 1 };
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Does this image contain explicit sexual content, nudity, or graphic violence? Reply ONLY with YES or NO.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim().toUpperCase();
    if (answer === "YES") {
      return { action: "end_session", confidence: 0.85, reason: "Explicit content in video frame" };
    }
    return { action: "allow", confidence: 0.8 };
  } catch {
    return { action: "allow", confidence: 0.5 };
  }
}
