"use client";

export default function Error({ error, reset }) {
  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 16
        }}
      >
        <h2 style={{ marginTop: 0 }}>Något gick fel i appen</h2>
        <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
          Det här är ett klientfel (UI). Klicka på knappen för att ladda om sidan.
        </p>

        <details style={{ marginTop: 10, opacity: 0.85 }}>
          <summary>Teknisk info</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(error?.message || error)}</pre>
        </details>

        <button
          onClick={() => reset()}
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer"
          }}
        >
          Ladda om
        </button>
      </div>
    </main>
  );
}

