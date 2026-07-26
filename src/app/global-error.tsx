"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es" className="dark">
      <body style={{ background: "#0a0a0a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", textAlign: "center", padding: "2rem" }}>
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "0.5rem" }}>Error crítico</h1>
          <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Se ha producido un error inesperado. Por favor recarga la página.
          </p>
          {error.digest && (
            <p style={{ color: "#666", fontSize: "0.75rem", fontFamily: "monospace", marginBottom: "1rem" }}>
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: "#a3e635", color: "#000", border: "none", borderRadius: "0.5rem", padding: "0.75rem 1.5rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
