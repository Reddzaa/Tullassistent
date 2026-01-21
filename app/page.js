"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

/** --------- Safe helpers (prevent UI crashes) --------- */
function asArray(x) {
  if (Array.isArray(x)) return x.filter((v) => typeof v === "string" && v.trim().length);
  if (typeof x === "string" && x.trim().length) return [x.trim()];
  return [];
}
function asString(x) {
  return typeof x === "string" ? x : "";
}

function normalizeStructured(s) {
  if (!s || typeof s !== "object") return null;

  const normalized = {
    // NEW
    svar: asString(s.svar),

    saknas_kontrollfragor: asArray(s.saknas_kontrollfragor),
    typ_av_arende: asArray(s.typ_av_arende),
    hs_kod: asArray(s.hs_kod),
    andra_uppgifter_koder: asArray(s.andra_uppgifter_koder),
    kopierbar_tulltext: asString(s.kopierbar_tulltext),
    checklista: asArray(s.checklista),
    viktigt_att_notera: asArray(s.viktigt_att_notera)
  };

  // valid if it has at least "svar" or any other content
  const hasAny =
    normalized.svar.trim().length ||
    normalized.saknas_kontrollfragor.length ||
    normalized.typ_av_arende.length ||
    normalized.hs_kod.length ||
    normalized.andra_uppgifter_koder.length ||
    normalized.kopierbar_tulltext.trim().length ||
    normalized.checklista.length ||
    normalized.viktigt_att_notera.length;

  return hasAny ? normalized : null;
}

/** --------- UI components --------- */
function IconButton({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: "var(--shadow)"
      }}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 14,
        background: "var(--panel)",
        boxShadow: "var(--shadow)"
      }}
    >
      <div style={{ fontWeight: 850, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Bullets({ items }) {
  const safe = asArray(items);
  if (safe.length === 0) return <div style={{ color: "var(--muted)" }}>—</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
      {safe.map((x, i) => (
        <li key={i} style={{ lineHeight: 1.4 }}>
          {x}
        </li>
      ))}
    </ul>
  );
}

function CopyBox({ text }) {
  const safeText = asString(text);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(safeText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 12,
          background: "var(--code-bg)",
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.5
        }}
      >
        {safeText || "—"}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          onClick={copy}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            cursor: "pointer"
          }}
        >
          {copied ? "Kopierat ✅" : "Kopiera tulltext"}
        </button>
      </div>
    </div>
  );
}

function Details({ structured }) {
  const [open, setOpen] = useState(false);

  // hide details if basically empty
  const hasDetails =
    structured.saknas_kontrollfragor.length ||
    structured.typ_av_arende.length ||
    structured.hs_kod.length ||
    structured.andra_uppgifter_koder.length ||
    structured.kopierbar_tulltext.trim().length ||
    structured.checklista.length ||
    structured.viktigt_att_notera.length;

  if (!hasDetails) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "1px solid var(--border)",
          background: "var(--panel)",
          borderRadius: 14,
          padding: "10px 12px",
          cursor: "pointer",
          boxShadow: "var(--shadow)"
        }}
      >
        {open ? "Dölj detaljer" : "Visa detaljer"}
      </button>

      {open && (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <SectionCard title="1) Saknas / kontrollfrågor">
            <Bullets items={structured.saknas_kontrollfragor} />
          </SectionCard>

          <SectionCard title="2) Typ av ärende">
            <Bullets items={structured.typ_av_arende} />
          </SectionCard>

          <SectionCard title="3) HS-kod">
            <Bullets items={structured.hs_kod} />
          </SectionCard>

          <SectionCard title="4) Andra obligatoriska uppgifter/koder">
            <Bullets items={structured.andra_uppgifter_koder} />
          </SectionCard>

          <SectionCard title="5) Kopierbar tulltext">
            <CopyBox text={structured.kopierbar_tulltext} />
          </SectionCard>

          <SectionCard title="6) Checklista">
            <Bullets items={structured.checklista} />
          </SectionCard>

          <SectionCard title="7) Viktigt att notera">
            <Bullets items={structured.viktigt_att_notera} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [log, setLog] = useState([]); // { role, text, structured? }
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("system");
  const bottomRef = useRef(null);

  /** ---- Theme handling (no extra libs) ---- */
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);

    const root = document.documentElement;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    root.dataset.theme = resolved;
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "system" ? "dark" : t === "dark" ? "light" : "system"));
  }

  const themeLabel = useMemo(() => {
    if (theme === "system") return "Tema: System";
    if (theme === "dark") return "Tema: Mörkt";
    return "Tema: Ljust";
  }, [theme]);

  function restart() {
    setLog([]);
    setMessage("");
    setLoading(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, loading]);

  async function safeJson(r) {
    try {
      return await r.json();
    } catch {
      return null;
    }
  }

  async function send() {
    const text = message.trim();
    if (!text || loading) return;

    const history = log.slice(-12).map((m) => ({ role: m.role, content: String(m.text || "") }));

    setLog((l) => [...l, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const r = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history })
      });

      const data = await safeJson(r);
      if (!r.ok) throw new Error(data?.error || `Serverfel (${r.status})`);

      const normalized = normalizeStructured(data?.structured);

      // NEW: prefer structured.svar as the human chat reply
      const reply =
        (normalized?.svar && normalized.svar.trim()) ||
        String(data?.reply || "").trim();

      if (!reply) throw new Error("Tomt svar från servern.");

      setLog((l) => [
        ...l,
        {
          role: "assistant",
          text: reply,
          structured: normalized
        }
      ]);
    } catch (e) {
      setLog((l) => [...l, { role: "assistant", text: `Fel: ${e?.message || "Okänt fel"}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "38px auto", padding: 16 }}>
      {/* Hero */}
      <div
        style={{
          position: "relative",
          height: 240,
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)"
        }}
      >
        <Image
          src="/svinesund.jpg"
          alt="Svinesundsbron mellan Sverige och Norge"
          fill
          priority
          style={{ objectFit: "cover" }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.20) 55%, rgba(0,0,0,0.05) 100%)"
          }}
        />

        <div style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 26 }}>🚚</div>
                <h1 style={{ margin: 0, color: "white", fontSize: 26, letterSpacing: -0.3 }}>
                  Tullassistent
                </h1>
              </div>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.82)", fontSize: 14 }}>
                Svensk–norsk tull · import · export · transiter (T1/T2)
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <IconButton onClick={toggleTheme} disabled={loading} title={themeLabel}>
                🌓
              </IconButton>
              <IconButton onClick={restart} disabled={loading} title="Rensar chatten och startar nytt ärende">
                Nytt ärende
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div
        style={{
          marginTop: 18,
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: 16,
          background: "var(--panel)",
          boxShadow: "var(--shadow)"
        }}
      >
        {log.length === 0 ? (
          <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Beskriv ett ärende (import/export/transit). Jag svarar först kort och tydligt — och du kan öppna “Visa detaljer” vid behov.
          </div>
        ) : (
          log.map((m, i) => (
            <div key={i} style={{ margin: "14px 0" }}>
              <div style={{ fontWeight: 850, marginBottom: 8, color: "var(--muted)" }}>
                {m.role === "user" ? "Du" : "Assistent"}
              </div>

              {m.role === "user" ? (
                <div
                  style={{
                    marginLeft: "auto",
                    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                    color: "white",
                    padding: 12,
                    borderRadius: 18,
                    maxWidth: "88%",
                    whiteSpace: "pre-wrap",
                    boxShadow: "var(--shadow)"
                  }}
                >
                  {m.text}
                </div>
              ) : (
                <div>
                  {/* Main assistant reply bubble */}
                  <div
                    style={{
                      background: "var(--code-bg)",
                      padding: 12,
                      borderRadius: 18,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      border: "1px solid var(--border)"
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Optional expandable details */}
                  {m.structured ? <Details structured={m.structured} /> : null}
                </div>
              )}
            </div>
          ))
        )}

        {loading && <div style={{ marginTop: 10, color: "var(--muted)" }}>✍️ Assistenten skriver…</div>}
        <div ref={bottomRef} />

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Skriv din fråga…"
            style={{ flex: 1, padding: 12, borderRadius: 16 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              cursor: "pointer"
            }}
          >
            {loading ? "Skickar…" : "Skicka"}
          </button>
        </div>

        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>
          Tips: Klicka <b>Nytt ärende</b> för att rensa chatten. Klicka 🌓 för att växla tema (System → Mörkt → Ljust).
        </div>
      </div>
    </main>
  );
}
