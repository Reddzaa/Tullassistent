import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message must be a non-empty string" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Du är en kunnig tullassistent. Svara tydligt på svenska. Be om förtydligande om något saknas."
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply: data.output_text ?? ""
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
