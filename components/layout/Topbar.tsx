"use client";

import { useRouter } from "next/navigation";

interface Props {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: Props) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabaseClient");
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/login");
  }

  return (
    <header style={{
      height: 54, borderBottom: "1px solid #1e2333",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px",
      background: "rgba(13,15,22,0.96)", backdropFilter: "blur(10px)",
      position: "sticky", top: 0, zIndex: 20,
      gap: 8,
    }}>
      {/* Left: hamburger + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={onMenuClick}
          className="hamburger-btn"
          style={{
            display: "none", /* shown via CSS on mobile */
            background: "none", border: "none",
            color: "#D4AF37", cursor: "pointer",
            padding: "4px 6px", borderRadius: 6,
            flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center",
          }}
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
        </button>

        {/* Brand mark on mobile */}
        <div className="topbar-brand" style={{ display: "none" }}>
          <span style={{
            fontSize: 15, fontWeight: 800,
            background: "linear-gradient(135deg, #D4AF37, #F0D060)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>◆ Stone ERP</span>
        </div>

        {/* Desktop subtitle */}
        <div className="topbar-subtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "linear-gradient(135deg,#D4AF37,#F0D060)", boxShadow: "0 0 6px rgba(212,175,55,0.6)" }} />
          <span style={{ fontSize: 12, color: "#4b5563" }}>Stone ERP — Countertop fabrication management</span>
        </div>
      </div>

      {/* Right: role + sign out */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          fontSize: 11, color: "#D4AF37",
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 20, padding: "3px 10px",
          whiteSpace: "nowrap",
        }}>
          Admin
        </div>
        <button onClick={handleLogout} style={{
          fontSize: 12, color: "#6b7280",
          background: "none", border: "1px solid #1e2333",
          borderRadius: 8, padding: "4px 10px", cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          Sign out
        </button>
      </div>
    </header>
  );
}
