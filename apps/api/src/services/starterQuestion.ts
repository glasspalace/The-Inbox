import OpenAI from "openai";
import type { IdeologyProfile, Topic } from "@parallax/shared";
import { config } from "../config.js";

const client = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

function fallbackStarterQuestion(topic: Topic): string {
  return `What personal experience most shaped how you think about ${topic.title.toLowerCase()}?`;
}

function axisSummary(profile: IdeologyProfile): string {
  return [
    `economic ${profile.econ}`,
    `diplomatic ${profile.dipl}`,
    `civil liberties ${profile.civil}`,
    `social change ${profile.scty}`,
  ].join(", ");
}

export async function generateStarterQuestion(
  topic: Topic,
  a: IdeologyProfile,
  b: IdeologyProfile
): Promise<string> {
  if (!client) {
    return fallbackStarterQuestion(topic);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content:
            "Create one neutral, respectful starter question for two people with different civic views. The question must invite personal reasoning, avoid yes/no framing, avoid loaded language, and be under 28 words. Return only the question.",
        },
        {
          role: "user",
          content: [
            `Broad topic: ${topic.title}`,
            `Topic scope: ${topic.description}`,
            `User A profile: ${axisSummary(a)}`,
            `User B profile: ${axisSummary(b)}`,
          ].join("\n"),
        },
      ],
    });

    const question = response.choices[0]?.message?.content?.trim();
    if (!question) {
      return fallbackStarterQuestion(topic);
    }

    return question.replace(/^["']|["']$/g, "");
  } catch {
    return fallbackStarterQuestion(topic);
  }
}
