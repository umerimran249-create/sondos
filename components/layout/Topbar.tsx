"use client";

import { useRouter } from "next/navigation";

export function Topbar() {
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
      padding: "0 20px",
      background: "rgba(13,15,22,0.92)", backdropFilter: "blur(10px)",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "linear-gradient(135deg,#D4AF37,#F0D060)",
          boxShadow: "0 0 6px rgba(212,175,55,0.6)",
        }} />
        <span style={{ fontSize: 12, color: "#4b5563" }}>
          Stone ERP — Countertop fabrication management
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          fontSize: 11, color: "#D4AF37",
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 20, padding: "3px 10px",
        }}>
          Admin
        </div>
        <button onClick={handleLogout} style={{
          fontSize: 12, color: "#6b7280",
          background: "none", border: "1px solid #1e2333",
          borderRadius: 8, padding: "4px 12px", cursor: "pointer",
        }}>
          Sign out
        </button>
      </div>
    </header>
  );
}
