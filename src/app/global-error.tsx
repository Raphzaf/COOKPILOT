"use client";

/** Last-resort boundary (root layout failure). Rendered without providers, so the copy is bilingual. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf6ee", color: "#26251f", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 32 }}>Something went wrong · Une erreur est survenue</h1>
          <p style={{ color: "#6b685c" }}>Please try again. · Veuillez réessayer.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#55622f", color: "#fffdf8", fontSize: 15, cursor: "pointer" }}>
            Retry · Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
