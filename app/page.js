"use client";

import { useEffect, useRef, useState } from "react";

function SectionCard({ title, children }) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
        background: "white"
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Bullets({ items }) {
  if (!Array.isArray(items) || items.length === 0) return <div>—</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
      {items.map((x, i) => (
        <li key={i} style={{ lineHeight: 1.35 }}>
          {x}
        </li>
      ))}
    </ul>
  );
}

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#f9fafb",
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.45
        }}
      >
        {text || "—"}
      </div>
      <button
        onClick={copy}
        style={{
          marginTop: 8,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          cursor: "pointer"
        }}
      >
        {copied ? "Kopierat ✅" : "Kopiera tulltext"}
      </button>
    </div>
  );
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // ✅ Restart måste ligga INUTI komponenten (så den kan använda setLog osv)
  function restart() {
    setLog([]);
    setMessage("");
    setLoading(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, loading]);

  async function send() {
    const text = message.trim();
    if (!text || loading) return;

    // Ta en snapshot av loggen FÖRE vi lägger till nya user-meddelandet
    const history = log.map((m) => ({
      role: m.role,
      content: m.text
    }));

    setLog((l) => [...l, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ Skicka med history så boten kan fortsätta samma ärende
        body: JSON.stringify({ message: text, history })
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Något gick fel");

      if (!data?.reply || String(data.reply).trim().length === 0) {
        throw new Error("Tomt svar från servern.");
      }

      setLog((l) => [
        ...l,
        { role: "assistant", text: data.reply, structured: data.structured }
      ]);
    } catch (e) {
      setLog((l) => [...l, { role: "assistant", text: `Fel: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14
        }}
      >
        <div style={{ fontSize: 28 }}>🚢</div>
        <h1 style={{ margin: 0 }}>Tullassistent</h1>

        {/* ✅ Knappen ligger snyggt i headern */}
        <button
          onClick={restart}
          disabled={loading}
          style={{
            marginLeft: "auto",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            cursor: "pointer"
          }}
          title="Rensar chatten och startar nytt ärende"
        >
          Nytt ärende
        </button>
      </header>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" }}>
        {log.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>
            Beskriv ett ärende (import/export/transit) så ställer jag kontrollfrågor och tar fram HS-kod m.m.
          </p>
        ) : (
          log.map((m, i) => (
            <div key={i} style={{ margin: "14px 0" }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                {m.role === "user" ? "Du" : "Assistent"}
              </div>

              {m.role === "user" ? (
                <div
                  style={{
                    marginLeft: "auto",
                    background: "#2563eb",
                    color: "white",
                    padding: 12,
                    borderRadius: 14,
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {m.text}
                </div>
              ) : m.structured ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <SectionCard title="1) Saknas / kontrollfrågor">
                    <Bullets items={m.structured.saknas_kontrollfragor} />
                  </SectionCard>

                  <SectionCard title="2) Typ av ärende">
                    <Bullets items={m.structured.typ_av_arende} />
                  </SectionCard>

                  <SectionCard title="3) HS-kod">
                    <Bullets items={m.structured.hs_kod} />
                  </SectionCard>

                  <SectionCard title="4) Andra obligatoriska uppgifter/koder">
                    <Bullets items={m.structured.andra_uppgifter_koder} />
                  </SectionCard>

                  <SectionCard title="5) Kopierbar tulltext">
                    <CopyBox text={m.structured.kopierbar_tulltext} />
                  </SectionCard>

                  <SectionCard title="6) Checklista">
                    <Bullets items={m.structured.checklista} />
                  </SectionCard>

                  <SectionCard title="7) Viktigt att notera">
                    <Bullets items={m.structured.viktigt_att_notera} />
                  </SectionCard>
                </div>
              ) : (
                <div
                  style={{
                    background: "#f3f4f6",
                    padding: 12,
                    borderRadius: 14,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5
                  }}
                >
                  {m.text}
                </div>
              )}
            </div>
          ))
        )}

        {loading && <div style={{ marginTop: 10, color: "#6b7280" }}>✍️ Assistenten skriver…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv din fråga…"
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb"
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            cursor: "pointer"
          }}
        >
          {loading ? "Skickar…" : "Skicka"}
        </button>
      </div>
    </main>
  );
}
