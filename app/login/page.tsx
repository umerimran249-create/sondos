"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/supabaseClient");
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }
      router.push("/");
    } catch {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#0b0d11",
      backgroundImage:"radial-gradient(ellipse at 60% 20%, rgba(212,175,55,0.06) 0%, transparent 60%)",
    }}>
      <div style={{
        width: 380, padding:"40px 36px",
        background:"#13161d", border:"1px solid #1e2333",
        borderRadius:16, boxShadow:"0 8px 48px rgba(0,0,0,0.6)",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            fontSize:28, fontWeight:900,
            background:"linear-gradient(135deg,#D4AF37,#F0D060)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            letterSpacing:"-0.03em",
          }}>◆ Stone ERP</div>
          <div style={{ fontSize:11, color:"#4b5563", marginTop:4, letterSpacing:"0.08em" }}>
            FABRICATION MANAGEMENT SYSTEM
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:11, color:"#6b7280", marginBottom:4, fontWeight:500 }}>
              EMAIL ADDRESS
            </label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width:"100%", padding:"10px 12px", borderRadius:8,
                background:"#0b0d11", border:"1px solid #252a38",
                color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box",
              }}
              onFocus={e => e.target.style.borderColor="#D4AF37"}
              onBlur={e => e.target.style.borderColor="#252a38"}
            />
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, color:"#6b7280", marginBottom:4, fontWeight:500 }}>
              PASSWORD
            </label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width:"100%", padding:"10px 12px", borderRadius:8,
                background:"#0b0d11", border:"1px solid #252a38",
                color:"#f1f5f9", fontSize:14, outline:"none", boxSizing:"border-box",
              }}
              onFocus={e => e.target.style.borderColor="#D4AF37"}
              onBlur={e => e.target.style.borderColor="#252a38"}
            />
          </div>
          {error && (
            <div style={{ fontSize:12, color:"#f87171", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:6, padding:"8px 12px" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{
              width:"100%", padding:"11px", borderRadius:8,
              background: loading ? "#4b5563" : "linear-gradient(135deg,#D4AF37,#A88B20)",
              color:"#0b0d11", fontWeight:700, fontSize:14,
              border:"none", cursor: loading ? "not-allowed":"pointer",
              boxShadow:"0 2px 12px rgba(212,175,55,0.25)",
              marginTop:4,
            }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#374151", marginBottom:8 }}>— or —</div>
          <a href="/" style={{
            display:"inline-block", width:"100%", padding:"10px",
            borderRadius:8, border:"1px solid #252a38",
            color:"#6b7280", fontSize:13, textAlign:"center",
            textDecoration:"none", background:"transparent",
          }}>
            Enter Dashboard (Dev Mode)
          </a>
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#374151" }}>
          Stone ERP v1.0 · Countertop fabrication management
        </p>
      </div>
    </div>
  );
}
