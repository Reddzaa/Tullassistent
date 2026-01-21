import { NextResponse } from "next/server";
import {
  PM_PROMPT,
  TULL_EXPERT_PROMPT,
  RISK_CONTROL_PROMPT,
  FORMATTER_PROMPT
} from "../../../../prompts/agents";

// Om du inte har alias för "@/prompts", använd istället:
// import { PM_PROMPT, ... } from "../../../prompts/agents";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function json(res, status = 200) {
  return new NextResponse(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" }
  });
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

  return data?.output_text || "";
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
      .map((m) => `- ${m?.role === "user" ? "User" : "Assistant"}: ${String(m?.content || "").slice(0, 1200)}`)
      .join("\n");

    const userPacket = `Historik (kort):\n${historyText || "(ingen)"}\n\nSenaste användarmeddelande:\n${message}`;

    const model = "gpt-4o-mini";

    // 1) PM: avgör om vi ska fråga mer eller fortsätta
    const pmRaw = await callOpenAI({
      apiKey,
      model,
      system: PM_PROMPT,
      user: userPacket
    });

    const pm = safeParseJson(pmRaw);
    // Om PM inte gav giltig JSON, fall back till "PROCEED"
    const nextStep = pm?.next_step === "ASK_MORE" ? "ASK_MORE" : "PROCEED";

    // 2) Tull-expert: gör innehåll
    // Om PM säger ASK_MORE vill vi fortfarande låta experten formulera kontrollfrågorna bra.
    const expertInput = [
      `PM output:\n${pmRaw}`,
      `\n---\n`,
      `Underlag:\n${userPacket}`
    ].join("");

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

    // 4) Formatterare: tvinga JSON enligt schema
    const formattedJsonText = await callOpenAI({
      apiKey,
      model,
      system: FORMATTER_PROMPT,
      user: riskReviewed
    });

    const structured = safeParseJson(formattedJsonText);

    // Reply: vi skickar alltid tillbaka något som UI kan visa
    // - om structured parseas: reply kan vara den JSON-strängen (för debug) eller tom
    // - annars: fallback till rå formatter-text
    if (structured && typeof structured === "object") {
      return json({
        reply: "OK",
        structured
      });
    }

    // Fallback om formatteraren råkar ge icke-JSON:
    return json({
      reply: formattedJsonText || riskReviewed || expertDraft || "Tomt svar",
      structured: null,
      meta: { nextStep }
    });
  } catch (e) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

