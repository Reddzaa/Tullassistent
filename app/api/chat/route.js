export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server missing OPENAI_API_KEY" }), { status: 500 });
    }

    const system = "Du är en hjälpsam assistent. Svara kort, tydligt och på svenska.";

    const r = await fetch("https://api.openai.com/v1/responses", {

      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
  model: "gpt-4o-mini",
  input: [
    {
      role: "system",
      content: system
    },
    {
      role: "user",
      content: message
    }
  ]
})

    const data = await r.json();

    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "OpenAI error" }), { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
