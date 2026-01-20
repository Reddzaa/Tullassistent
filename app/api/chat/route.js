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
    }
  }
  return parts.join("\n").trim();
}

function safeJsonParse(text) {
  try {
    // Om modellen ändå råkar wrappa med ```json ... ```
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return { ok: true, value: JSON.parse(cleaned) };
  } catch {
    return { ok: false, value: null };
  }
}

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message must be a non-empty string" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });

    const payload = {
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: message.trim() }] }
      ]
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("OpenAI error:", data);
      return NextResponse.json({ error: data?.error?.message || "OpenAI error" }, { status: 500 });
    }

    const reply = extractText(data);
    if (!reply) return NextResponse.json({ error: "Empty response" }, { status: 502 });

    // ✅ Försök parsa JSON
    const parsed = safeJsonParse(reply);
    if (parsed.ok) {
      return NextResponse.json({ reply, structured: parsed.value });
    }

    // Fallback: skicka bara text
    return NextResponse.json({ reply, structured: null });
  } catch (e) {
    console.error("Server error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
