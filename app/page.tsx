export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Server Defense Sling</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Defend the servers from the virus. Drag the logo, aim, and release.
      </p>

      <div
        style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}
      >
        <a
          href="/play?level=1"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #ddd",
            textDecoration: "none",
          }}
        >
          Play Level 1
        </a>

        <a
          href="/play?level=2"
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #ddd",
            textDecoration: "none",
          }}
        >
          Play Level 2
        </a>
      </div>

      <p style={{ marginTop: 20, fontSize: 13, opacity: 0.75 }}>
        Tip: best in landscape on mobile.
      </p>
    </main>
  );
}
