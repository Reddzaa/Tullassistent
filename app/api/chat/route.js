export async function POST(req) {
  try {
    const { message } = await req.json();

    // 1) Validera input
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2) Hämta API-nyckeln från env
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3) Systeminstruktion (byt ut senare till din riktiga tull-logik)
    const system =
      "Du är en hjälpsam tullassistent. Svara kort, tydligt och på svenska. Om viktig information saknas, ställ en följdfråga istället för att gissa.";

    // 4) Anropa Responses API (rekommenderat)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: message }
        ]
      })
    });

    const data = await r.json();

    // 5) Om OpenAI svarar med fel, skicka det vidare tydligt
    if (!r.ok) {
      const msg = data?.error?.message || "OpenAI error";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 6) Plocka ut textsvaret (output_text är enklast)
    const reply = data?.output_text || "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    // Fångar JSON-fel, nätfel etc.
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
