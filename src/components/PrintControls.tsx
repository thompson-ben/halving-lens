"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

// Print / Save-as-PDF control. `auto` triggers the browser print dialog on load
// (used by the dedicated print route). Hidden from the printed output (.no-print).
export function PrintControls({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => {
        try {
          window.print();
        } catch {
          /* ignore */
        }
      }, 600);
      return () => clearTimeout(t);
    }
  }, [auto]);

  return (
    <div className="no-print" style={{ textAlign: "center", padding: "16px" }}>
      <button
        onClick={() => window.print()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#15171c",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "11px 22px",
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <Printer size={15} /> Save as PDF
      </button>
    </div>
  );
}
