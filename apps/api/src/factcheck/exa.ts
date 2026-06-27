import { Exa } from "exa-js";
import OpenAI from "openai";
import type { FactCheck, FactSource, FactVerdict } from "@parallax/shared";
import { config } from "../config.js";
import { saveFactCheck } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

const exa = config.exaApiKey ? new Exa(config.exaApiKey) : null;
const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const recentClaims = new Map<string, Set<string>>();

function claimKey(sessionId: string, claim: string): string {
  return `${sessionId}:${claim.toLowerCase().slice(0, 100)}`;
}

export async function extractClaim(text: string): Promise<string | null> {
  if (!openai) {
    const factualPattern = /\b(is|are|was|were|has|have|percent|%|\d{4})\b/i;
    if (factualPattern.test(text) && text.length > 20) {
      return text.slice(0, 200);
    }
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 100,
      messages: [
        {
          role: "system",
          content:
            "Extract a single verifiable factual claim from the user message. If there is no factual claim (only opinion), reply with NONE. Reply with only the claim text, nothing else.",
        },
        { role: "user", content: text },
      ],
    });

    const claim = response.choices[0]?.message?.content?.trim();
    if (!claim || claim === "NONE") return null;
    return claim;
  } catch {
    return null;
  }
}

export async function factCheckClaim(
  sessionId: string,
  claim: string
): Promise<FactCheck | null> {
  const key = claimKey(sessionId, claim);
  const seen = recentClaims.get(sessionId) ?? new Set();
  if (seen.has(key)) return null;
  seen.add(key);
  recentClaims.set(sessionId, seen);

  let verdict: FactVerdict = "unverifiable";
  let summary = "Unable to verify this claim automatically.";
  let sources: FactSource[] = [];

  if (exa) {
    try {
      const results = await exa.searchAndContents(claim, {
        type: "fast",
        numResults: 5,
        highlights: true,
        text: { maxCharacters: 2000 },
      });

      sources = results.results.slice(0, 3).map((r: { title?: string | null; url: string }) => ({
        title: r.title ?? r.url,
        url: r.url,
      }));

      if (openai && results.results.length > 0) {
        const context = results.results
          .map((r: { title?: string | null; highlights?: string[]; text?: string }) =>
            `${r.title}: ${r.highlights?.join(" ") ?? r.text?.slice(0, 300)}`
          )
          .join("\n");

        const analysis = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 150,
          messages: [
            {
              role: "system",
              content:
                'Given sources, assess the claim. Reply JSON: {"verdict":"supported|contradicted|mixed|unverifiable","summary":"one neutral sentence"}',
            },
            { role: "user", content: `Claim: ${claim}\n\nSources:\n${context}` },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(analysis.choices[0]?.message?.content ?? "{}") as {
          verdict?: FactVerdict;
          summary?: string;
        };
        verdict = parsed.verdict ?? "mixed";
        summary = parsed.summary ?? summary;
      } else if (sources.length > 0) {
        verdict = "mixed";
        summary = "Related sources found — this claim may need nuance.";
      }
    } catch {
      summary = "Fact-check service temporarily unavailable.";
    }
  } else {
    summary = "Configure EXA_API_KEY for live fact-checking. Claim recorded for review.";
  }

  const id = await saveFactCheck(sessionId, claim, verdict, summary, sources).catch(() => uuidv4());

  return {
    id,
    sessionId,
    claim,
    verdict,
    summary,
    sources,
    createdAt: new Date().toISOString(),
  };
}

export async function processMessageForFactCheck(
  sessionId: string,
  text: string
): Promise<FactCheck | null> {
  const claim = await extractClaim(text);
  if (!claim) return null;
  return factCheckClaim(sessionId, claim);
}
