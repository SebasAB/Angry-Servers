export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui",
        background:
          "radial-gradient(1200px 600px at 20% 20%, #1b2a5a 0%, rgba(11,16,32,0.95) 55%, #070a14 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          width: "min(760px, 92vw)",
          borderRadius: 24,
          padding: "28px 26px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(104,255,138,0.12)",
            border: "1px solid rgba(104,255,138,0.22)",
            color: "#bfffd0",
            fontSize: 13,
            letterSpacing: 0.2,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#68ff8a",
              boxShadow: "0 0 18px rgba(104,255,138,0.7)",
              display: "inline-block",
            }}
          />
          Demo interactiva
        </div>

        <h1 style={{ margin: "0 0 10px", fontSize: 36, lineHeight: 1.15 }}>
          Security Data: Virus Defense
        </h1>

        <p style={{ margin: "0 auto 22px", opacity: 0.9, fontSize: 16, lineHeight: 1.55 }}>
          Los servidores de Security Data están bajo un ataque cibernético. Si son
          comprometidos, todos sus clientes estarán en riesgo. Actúa ahora y protege
          a Security Data para evitar una catástrofe.
        </p>

        <a
          href="/play?level=1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px 18px",
            borderRadius: 16,
            background:
              "linear-gradient(135deg, rgba(104,255,138,0.95) 0%, rgba(64,200,255,0.95) 100%)",
            color: "#07101f",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 14px 30px rgba(64,200,255,0.18)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          Comienza a Jugar
          <span style={{ opacity: 0.8 }}>→</span>
        </a>

        <p style={{ marginTop: 18, fontSize: 13, opacity: 0.75 }}>
          Tip: en móvil se juega mejor en horizontal.
        </p>
      </div>
    </main>
  );
}
