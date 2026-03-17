"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuoteDrawingCanvas } from "@/components/QuoteDrawingCanvas";

type QuoteItem = { id: string; description: string; quantity: number; unit_price: number; line_total: number };
type Quote = {
  id: string; quote_id: string; quote_date: string; status: string;
  total_amount: number; notes: string | null;
  customers: { id: string; name: string; email: string; phone: string } | null;
  quote_items: QuoteItem[];
};

const fetcher = (url: string) => fetch(url).then(r => r.json());
const STATUS_COLOR: Record<string,string> = { draft:"#6b7280", sent:"#60a5fa", approved:"#4ade80", rejected:"#f87171", converted:"#D4AF37" };
const TABS = ["Overview","Drawing","Line Items"] as const;
type Tab = typeof TABS[number];

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const { data, mutate } = useSWR<{ quote: Quote }>(`/api/quotes/${params.id}`, fetcher);
  const { data: layoutData } = useSWR(`/api/quotes/${params.id}/drawing`, fetcher);

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    // will be overridden by useEffect on client
    return "Overview";
  });

  useEffect(() => {
    if (searchParams.get("tab") === "drawing") setTab("Drawing");
  }, [searchParams]);

  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{ ok: boolean; msg: string } | null>(null);

  function showPopup(ok: boolean, msg: string) {
    setPopup({ ok, msg });
    setTimeout(() => setPopup(null), 4000);
  }

  const quote = data?.quote;
  const layout = layoutData?.layout ?? null;
  const items: QuoteItem[] = quote?.quote_items ?? [];

  async function updateStatus() {
    if (!status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${params.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status, notes: notes || undefined }) });
      if (!res.ok) throw new Error("Save failed");
      showPopup(true, "Quote status and notes saved successfully.");
      mutate();
    } catch {
      showPopup(false, "Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleApplied(totalCost: number, totalSqft: number) {
    showPopup(true, `Drawing saved and applied to quote — ${totalSqft.toFixed(2)} sqft · $${totalCost.toFixed(2)}`);
    mutate();
  }

  if (!quote) return (
    <div className="space-y-4">
      <Link href="/quotes" className="text-sm" style={{color:"var(--gold)"}}>← Back to Quotes</Link>
      <div className="card text-center py-12" style={{color:"var(--text-muted)"}}>Loading quote…</div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── CENTERED SAVE POPUP ── */}
      {popup && (
        <div style={{
          position:"fixed", inset:0, zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.5)", backdropFilter:"blur(3px)",
        }} onClick={() => setPopup(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: popup.ok ? "#0d2818" : "#2a0d0d",
            border: `2px solid ${popup.ok ? "#22c55e" : "#ef4444"}`,
            borderRadius: 18,
            padding: "32px 44px",
            minWidth: 340,
            maxWidth: 500,
            textAlign: "center",
            boxShadow: `0 0 80px ${popup.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
            animation: "fadeInScale 0.2s ease",
          }}>
            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>{popup.ok ? "✅" : "❌"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: popup.ok ? "#22c55e" : "#ef4444", marginBottom: 10 }}>
              {popup.ok ? "Saved Successfully" : "Save Failed"}
            </div>
            <div style={{ fontSize: 14, color: popup.ok ? "#86efac" : "#fca5a5", lineHeight: 1.6 }}>{popup.msg}</div>
            <button onClick={() => setPopup(null)} style={{
              marginTop: 22, padding: "7px 24px", borderRadius: 8,
              border: `1px solid ${popup.ok ? "#22c55e" : "#ef4444"}`,
              background: "transparent",
              color: popup.ok ? "#22c55e" : "#ef4444",
              fontSize: 13, cursor: "pointer", fontWeight: 600,
            }}>OK</button>
          </div>
          <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/quotes" style={{color:"var(--gold)"}}>Quotes</Link>
        <span style={{color:"var(--text-muted)"}}>›</span>
        <span className="text-white font-semibold">{quote.quote_id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{quote.quote_id}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="badge" style={{background:`${STATUS_COLOR[quote.status]}22`,color:STATUS_COLOR[quote.status]}}>
              {quote.status}
            </span>
            <span className="text-sm" style={{color:"var(--text-muted)"}}>{quote.quote_date}</span>
            <span className="text-sm font-semibold" style={{color:"var(--gold)"}}>
              ${(quote.total_amount??0).toLocaleString("en-US",{minimumFractionDigits:2})}
            </span>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{background:"var(--surface)",width:"fit-content"}}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"7px 18px", borderRadius:8, fontSize:13, fontWeight: tab===t?600:400, border:"none", cursor:"pointer",
            background: tab===t ? "linear-gradient(135deg,#D4AF37,#A88B20)" : "transparent",
            color: tab===t ? "#0b0d11" : "var(--text-muted)",
          }}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer card */}
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"var(--gold)"}}>Customer</h2>
            {quote.customers ? (
              <div className="space-y-1">
                <div className="text-white font-semibold">{quote.customers.name}</div>
                <div className="text-sm" style={{color:"var(--text-muted)"}}>{quote.customers.email}</div>
                <div className="text-sm" style={{color:"var(--text-muted)"}}>{quote.customers.phone}</div>
                <Link href={`/customers`} className="text-xs mt-1 block" style={{color:"var(--gold)"}}>View customer →</Link>
              </div>
            ) : <div className="text-sm" style={{color:"var(--text-muted)"}}>No customer linked</div>}
          </div>

          {/* Quote summary */}
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"var(--gold)"}}>Quote Summary</h2>
            <div className="space-y-2">
              {[["Quote ID",quote.quote_id],["Date",quote.quote_date],["Items",String(items.length)],["Total","$"+(quote.total_amount??0).toFixed(2)]].map(([l,v])=>(
                <div key={l} className="flex justify-between">
                  <span className="text-sm" style={{color:"var(--text-muted)"}}>{l}</span>
                  <span className="text-sm font-medium text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update status */}
          <div className="card">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"var(--gold)"}}>Update Status</h2>
            <select className="input mb-3" value={status||quote.status} onChange={e=>setStatus(e.target.value)}>
              {["draft","sent","approved","rejected","converted"].map(s=>(
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <textarea className="input mb-3" rows={2} placeholder="Notes…" value={notes||quote.notes||""} onChange={e=>setNotes(e.target.value)} />
            <button className="btn-primary w-full" onClick={updateStatus} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="card lg:col-span-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:"var(--gold)"}}>Notes</h2>
              <p className="text-sm" style={{color:"var(--text-muted)"}}>{quote.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DRAWING ── */}
      {tab === "Drawing" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Countertop Layout</h2>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Draw shapes and click <b style={{color:"var(--gold)"}}>Apply to Quote</b> to save measurements and update the quote total.</p>
            </div>
          </div>
          <QuoteDrawingCanvas
            quoteId={params.id}
            initialLayout={layout}
            onApplied={handleApplied}
          />
        </div>
      )}

      {/* ── LINE ITEMS ── */}
      {tab === "Line Items" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Line Items</h2>
            <span className="text-xs" style={{color:"var(--text-muted)"}}>Auto-populated from drawing</span>
          </div>
          {items.length ? (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Description</th><th className="text-center">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {items.map(i=>(
                      <tr key={i.id}>
                        <td className="text-white">{i.description}</td>
                        <td className="text-center">{i.quantity}</td>
                        <td className="text-right">${(i.unit_price??0).toFixed(2)}</td>
                        <td className="text-right font-semibold" style={{color:"var(--gold)"}}>${(i.line_total??0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right font-bold pt-3 text-white">Grand Total</td>
                      <td className="text-right font-bold pt-3" style={{color:"var(--gold)",fontSize:15}}>
                        ${items.reduce((s,i)=>s+(i.line_total??0),0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm mb-3" style={{color:"var(--text-muted)"}}>No line items yet.</p>
              <button className="btn-primary" onClick={()=>setTab("Drawing")}>Open Drawing Tool →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
