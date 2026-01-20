"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = message.trim();
    if (!text || loading) return;

    setLog((l) => [...l, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await r.json();

      if (!r.ok) throw new Error(data?.error || "Något gick fel");

      setLog((l) => [...l, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setLog((l) => [...l, { role: "assistant", text: `Fel: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Tullassistent</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 320 }}>
        {log.length === 0 ? (
          <p>Ställ en fråga om tull, import eller export.</p>
        ) : (
          log.map((m, i) => (
            <div key={i} style={{ margin: "12px 0" }}>
              <div style={{ fontWeight: 700 }}>{m.role === "user" ? "Du" : "Assistent"}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv din fråga…"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          {loading ? "Skickar…" : "Skicka"}
        </button>
      </div>
    </main>
  );
}
