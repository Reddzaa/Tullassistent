"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function send() {
    if (!message.trim() || loading) return;

    const text = message.trim();
    setMessage("");
    setLog((l) => [...l, { role: "user", text }]);
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      setLog((l) => [...l, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setLog((l) => [
        ...l,
        { role: "assistant", text: "⚠️ Något gick fel." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <h1>🚢 Tullassistent</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        {log.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "80%",
              margin: "12px 0",
              marginLeft: m.role === "user" ? "auto" : 0,
              padding: 12,
              borderRadius: 12,
              background: m.role === "user" ? "#0070f3" : "#f2f2f2",
              color: m.role === "user" ? "white" : "black"
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && <div>✍️ Assistenten skriver…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv din fråga…"
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: 1, padding: 12 }}
        />
        <button onClick={send} disabled={loading}>
          Skicka
        </button>
      </div>
    </main>
  );
}
