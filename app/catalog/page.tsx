"use client";

import { useState } from "react";
import useSWR from "swr";

type Product = {
  id: string; product_id: string; product_name: string; sku: string | null;
  color: string | null; country_of_origin: string | null; product_group: string | null;
  unit_type: string | null; base_cost: number | null; price_levels: number[] | null;
  available_sqft: number;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

function colorDot(color: string) {
  const c = color.toLowerCase();
  if (c.includes("black")) return "#2a2a2a";
  if (c.includes("white")) return "#e5e5e5";
  if (c.includes("grey") || c.includes("gray")) return "#9ca3af";
  if (c.includes("beige") || c.includes("cream")) return "#d4b896";
  if (c.includes("brown")) return "#92400e";
  if (c.includes("blue")) return "#3b82f6";
  if (c.includes("green")) return "#22c55e";
  if (c.includes("red") || c.includes("rosa")) return "#ef4444";
  if (c.includes("gold") || c.includes("yellow")) return "#D4AF37";
  if (c.includes("pink")) return "#f472b6";
  return "#6b7280";
}

const GROUPS = ["All", "slab", "tile", "sink", "accessory"];

export default function CatalogPage() {
  const { data } = useSWR<{ products: Product[] }>("/api/catalog", fetcher);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All");
  const [selected, setSelected] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", email: "", message: "", product_interest: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const products = (data?.products ?? []).filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.color?.toLowerCase().includes(q) || p.country_of_origin?.toLowerCase().includes(q);
    const matchGroup = group === "All" || p.product_group === group;
    return matchSearch && matchGroup;
  });

  async function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    const res = await fetch("/api/catalog", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, product_interest: selected?.product_name || lead.product_interest }),
    });
    setSubmitting(false);
    if (res.ok) { setSubmitted(true); setShowForm(false); setLead({ name:"", phone:"", email:"", message:"", product_interest:"" }); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c12", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: "rgba(13,15,22,0.97)", borderBottom: "1px solid #1e2333", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg,#D4AF37,#F0D060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>◆ SondosStone</div>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Premium Natural Stone Gallery</span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg,#D4AF37,#A88B20)", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Request a Quote
        </button>
      </header>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#0d0f16 0%,#13161d 100%)", padding: "60px 24px 48px", textAlign: "center", borderBottom: "1px solid #1e2333" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#D4AF37", marginBottom: 12, textTransform: "uppercase" }}>Premium Stone Collection</div>
        <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, margin: "0 0 12px", background: "linear-gradient(135deg,#fff,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Granite · Marble · Quartz
        </h1>
        <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto 28px" }}>
          Browse our full inventory of natural and engineered stone slabs — available for countertops, flooring, and custom fabrication.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, color, origin…"
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #252a38", background: "#13161d", color: "#f1f5f9", fontSize: 14, width: "100%", maxWidth: 340, outline: "none" }}
          />
          {GROUPS.map(g => (
            <button key={g} onClick={() => setGroup(g)} style={{
              padding: "9px 16px", borderRadius: 8, border: `1px solid ${group === g ? "#D4AF37" : "#252a38"}`,
              background: group === g ? "rgba(212,175,55,0.1)" : "transparent",
              color: group === g ? "#D4AF37" : "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize",
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ marginBottom: 20, color: "#4b5563", fontSize: 13 }}>{products.length} product{products.length !== 1 ? "s" : ""} found</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
          {products.map(p => (
            <div key={p.id} onClick={() => setSelected(p)} style={{
              background: "#13161d", border: `1px solid ${selected?.id === p.id ? "#D4AF37" : "#1e2333"}`,
              borderRadius: 14, overflow: "hidden", cursor: "pointer",
              transition: "transform 0.15s,border-color 0.15s",
              boxShadow: selected?.id === p.id ? "0 0 20px rgba(212,175,55,0.2)" : "0 4px 20px rgba(0,0,0,0.3)",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}>

              {/* Color swatch banner */}
              <div style={{ height: 80, background: `linear-gradient(135deg, ${p.color ? colorDot(p.color) : "#1a1e28"}22, ${p.color ? colorDot(p.color) : "#1a1e28"}44)`, borderBottom: "1px solid #1e2333", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.color ? colorDot(p.color) : "#374151", border: "3px solid rgba(255,255,255,0.15)", boxShadow: `0 0 20px ${p.color ? colorDot(p.color) : "#374151"}66` }} />
                {p.available_sqft > 0 && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20 }}>
                    In Stock
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{p.product_name}</div>

                {/* Dimensions row with color dot */}
                {p.color && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorDot(p.color), border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{p.color}</span>
                    {p.country_of_origin && <span style={{ fontSize: 11, color: "#4b5563" }}>· {p.country_of_origin}</span>}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>Starting from</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37" }}>
                      ${(p.price_levels?.[0] ?? p.base_cost ?? 0).toFixed(0)}
                      <span style={{ fontSize: 10, color: "#4b5563", fontWeight: 400 }}>/{p.unit_type ?? "sqft"}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {p.available_sqft > 0 && <div style={{ fontSize: 11, color: "#22c55e" }}>{p.available_sqft} sqft</div>}
                    <span style={{ fontSize: 10, background: "rgba(148,163,184,0.1)", color: "#94a3b8", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>{p.product_group}</span>
                  </div>
                </div>

                <button onClick={e => { e.stopPropagation(); setSelected(p); setShowForm(true); }} style={{
                  marginTop: 12, width: "100%", padding: "7px", borderRadius: 7,
                  background: "transparent", border: "1px solid #D4AF37", color: "#D4AF37",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Request Quote
                </button>
              </div>
            </div>
          ))}
        </div>

        {!products.length && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#374151" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪨</div>
            <p>No products found matching your search.</p>
          </div>
        )}
      </div>

      {/* Quote Request Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: "#13161d", border: "1px solid #252a38", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Request a Quote</div>
                {selected && <div style={{ fontSize: 12, color: "#D4AF37", marginTop: 2 }}>for {selected.product_name}</div>}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleSubmitLead} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Your Name *</label>
                  <input required value={lead.name} onChange={e => setLead(l => ({ ...l, name: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #252a38", background: "#0a0c12", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Phone</label>
                  <input value={lead.phone} onChange={e => setLead(l => ({ ...l, phone: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #252a38", background: "#0a0c12", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Email *</label>
                <input required type="email" value={lead.email} onChange={e => setLead(l => ({ ...l, email: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #252a38", background: "#0a0c12", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
              </div>
              {!selected && (
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Product Interest</label>
                  <input value={lead.product_interest} onChange={e => setLead(l => ({ ...l, product_interest: e.target.value }))}
                    placeholder="e.g. White marble countertop…"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #252a38", background: "#0a0c12", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Message</label>
                <textarea value={lead.message} onChange={e => setLead(l => ({ ...l, message: e.target.value }))} rows={3}
                  placeholder="Tell us about your project, dimensions, timeline…"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #252a38", background: "#0a0c12", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical" }} />
              </div>
              <button type="submit" disabled={submitting} style={{ padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#D4AF37,#A88B20)", border: "none", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Sending…" : "Send Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success toast */}
      {submitted && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0d2818", border: "1px solid #22c55e", borderRadius: 12, padding: "14px 20px", zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>✅ Request Sent!</div>
          <div style={{ fontSize: 12, color: "#86efac", marginTop: 4 }}>We'll be in touch shortly.</div>
          <button onClick={() => setSubmitted(false)} style={{ marginTop: 8, fontSize: 11, color: "#4b5563", background: "none", border: "none", cursor: "pointer" }}>Dismiss</button>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e2333", padding: "24px", textAlign: "center", color: "#374151", fontSize: 12 }}>
        <span style={{ color: "#D4AF37", fontWeight: 700 }}>◆ SondosStone</span> · Premium Stone Fabrication
        &nbsp;·&nbsp; <a href="/login" style={{ color: "#4b5563" }}>Staff Login</a>
      </footer>
    </div>
  );
}
