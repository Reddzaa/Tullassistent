import { NextResponse } from "next/server";
import {
  PM_PROMPT,
  TULL_EXPERT_PROMPT,
  RISK_CONTROL_PROMPT,
  FORMATTER_PROMPT
} from "@/prompts/agents";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function json(res, status = 200) {
  return new NextResponse(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Robust text-extraction for Responses API.
 * - supports data.output_text
 * - supports data.output[].content[].{type:"output_text", text:"..."} (or "text")
 */
function extractResponseText(data) {
  if (!data) return "";

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const out = data.output;
  if (!Array.isArray(out)) return "";

  let acc = "";

  for (const item of out) {
    // Most common: item.content is array
    const content = item?.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === "output_text" && typeof part?.text === "string") acc += part.text;
        if (part?.type === "text" && typeof part?.text === "string") acc += part.text;
      }
    }

    // Rare fallbacks
    if (typeof item?.text === "string") acc += item.text;
  }

  return acc.trim();
}

async function callOpenAI({ apiKey, model, system, user }) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    const msg = data?.error?.message || `OpenAI error (${r.status})`;
    throw new Error(msg);
  }

  return extractResponseText(data);
}

// --- Robust JSON parsing: klarar ```json ...``` + extra text runt JSON
function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;

  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 1) Försök direkt
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2) Plocka ut första {...} blocket
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function safeParseJson(text) {
  return extractJsonObject(text);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return json({ error: "Missing message" }, 400);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json({ error: "Server missing OPENAI_API_KEY" }, 500);
    }

    // Begränsa historik så requests inte sväller
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];
    const historyText = history
      .map(
        (m) =>
          `- ${m?.role === "user" ? "User" : "Assistant"}: ${String(m?.content || "").slice(0, 1200)}`
      )
      .join("\n");

    const userPacket = `Historik (kort):\n${historyText || "(ingen)"}\n\nSenaste användarmeddelande:\n${message}`;

    const model = "gpt-4o";

    // 1) PM
    const pmRaw = await callOpenAI({
      apiKey,
      model,
      system: PM_PROMPT,
      user: userPacket
    });

    const pm = safeParseJson(pmRaw);
    const nextStep = pm?.next_step === "ASK_MORE" ? "ASK_MORE" : "PROCEED";

    // 2) Tull-expert
    const expertInput = [`PM output:\n${pmRaw}`, `\n---\n`, `Underlag:\n${userPacket}`].join("");

    const expertDraft = await callOpenAI({
      apiKey,
      model,
      system: TULL_EXPERT_PROMPT,
      user: expertInput
    });

    // 3) Riskkontroll
    const riskReviewed = await callOpenAI({
      apiKey,
      model,
      system: RISK_CONTROL_PROMPT,
      user: expertDraft
    });

    // 4) Formatterare
    const formattedJsonText = await callOpenAI({
      apiKey,
      model,
      system: FORMATTER_PROMPT,
      user: riskReviewed
    });

    const structured = safeParseJson(formattedJsonText);

    const lengths = {
      pmRaw: (pmRaw || "").length,
      expertDraft: (expertDraft || "").length,
      riskReviewed: (riskReviewed || "").length,
      formattedJsonText: (formattedJsonText || "").length
    };

    if (structured && typeof structured === "object") {
      return json({
        reply: "OK",
        structured,
        meta: { stage: "parsed_formatter_json", nextStep, lengths }
      });
    }

    return json({
      reply: formattedJsonText || riskReviewed || expertDraft || "Tomt svar",
      structured: null,
      meta: {
        stage: "formatter_not_json_or_empty",
        nextStep,
        lengths,
        formattedPreview: String(formattedJsonText || "").slice(0, 400)
      }
    });
  } catch (e) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
