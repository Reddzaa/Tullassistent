import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "./systemPrompt";

function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") parts.push(c.text);
      if (typeof c?.content === "string") parts.push(c.content);
    }
  }

  return parts.join("\n").trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message;

    // 1) Validera input
    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message must be a non-empty string" },
        { status: 400 }
      );
    }

    // 2) Hämta API-nyckel från env
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    // 3) Skicka till OpenAI Responses API
    const payload = {
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: message.trim() }]
        }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    // 4) Fel från OpenAI
    if (!r.ok) {
      console.error("OpenAI error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI error" },
        { status: 500 }
      );
    }

    // 5) Extrahera text
    const reply = extractText(data);

    // 6) Skydd mot tomt svar (så du slipper “blankt” i UI)
    if (!reply) {
      console.error("Empty OpenAI reply:", data);
      return NextResponse.json(
        { error: "OpenAI returned an empty response" },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Server error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
