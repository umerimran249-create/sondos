"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Quote = {
  id: string; quote_id: string; quote_date: string; status: string;
  total_amount: number; notes: string | null;
  customers: { name: string } | null;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());
const STATUS: Record<string, string> = { draft:"badge-gray", sent:"badge-blue", approved:"badge-green", rejected:"badge-red", converted:"badge-gold" };
const STATUS_COLOR: Record<string,string> = { draft:"#6b7280", sent:"#60a5fa", approved:"#4ade80", rejected:"#f87171", converted:"#D4AF37" };

export default function QuotesPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<{ quotes: Quote[] }>("/api/quotes", fetcher);
  const { data: custData } = useSWR<{ customers: {id:string, name:string}[] }>("/api/customers", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id:"", notes:"", payment_type:"prepaid" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [filter, setFilter] = useState("all");

  const quotes = (data?.quotes ?? []).filter(q => filter === "all" || q.status === filter);
  const total = quotes.reduce((s, q) => s + (q.total_amount ?? 0), 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    await fetch(`/api/quotes/${id}`, { method:"DELETE" });
    mutate();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/quotes", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    mutate();
    // Redirect straight to the Drawing tab
    router.push(`/quotes/${json.quote.id}?tab=drawing`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Quotes</h1>
          <p className="page-subtitle">Create estimates and attach countertop drawings</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          + New Quote
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["All", "all", (data?.quotes ?? []).length],
          ["Draft", "draft", (data?.quotes ?? []).filter(q=>q.status==="draft").length],
          ["Sent", "sent", (data?.quotes ?? []).filter(q=>q.status==="sent").length],
          ["Approved", "approved", (data?.quotes ?? []).filter(q=>q.status==="approved").length],
        ].map(([label, f, count]) => (
          <button key={f as string} onClick={() => setFilter(f as string)} className="stat-card text-left"
            style={{ border: filter === f ? "1px solid var(--gold)" : undefined }}>
            <div className="stat-label">{label as string}</div>
            <div className="stat-value" style={{ color: filter === f ? "var(--gold)" : undefined }}>
              {count as number}
            </div>
          </button>
        ))}
      </div>

      {/* New quote form */}
      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-1 text-white">New Quote</h2>
          <p className="text-xs mb-4" style={{color:"var(--text-muted)"}}>
            After creating, you'll be taken directly to the Drawing Tool.
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div style={{padding:"8px 12px",background:"rgba(212,175,55,0.06)",borderRadius:8,border:"1px solid rgba(212,175,55,0.15)"}}>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>Quote ID will be auto-generated (e.g. </span>
              <span style={{fontSize:11,color:"var(--gold)",fontWeight:600}}>Q-{new Date().getFullYear()}-XXXX</span>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>)</span>
            </div>
            <div>
              <label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(f=>({...f,customer_id:e.target.value}))}>
                <option value="">— select customer —</option>
                {custData?.customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <select className="input" value={form.payment_type} onChange={e=>setForm(f=>({...f,payment_type:e.target.value}))}>
                <option value="prepaid">Pre-Paid (50% deposit required)</option>
                <option value="cod">COD — Cash on Delivery</option>
                <option value="net30">Net 30</option>
                <option value="net15">Net 15</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Kitchen remodel, master bath…"
                value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating…" : "✏ Create + Open Drawing Tool"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quote list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white font-semibold">
            {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
          </span>
          <span className="text-sm" style={{color:"var(--gold)"}}>
            Total: ${total.toLocaleString("en-US", {minimumFractionDigits:2})}
          </span>
        </div>

        {/* Empty state */}
        {!quotes.length && (
          <div className="text-center py-12">
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <p className="text-sm font-semibold text-white mb-1">No quotes yet</p>
            <p className="text-xs mb-4" style={{color:"var(--text-muted)"}}>
              Create a quote to start drawing countertop layouts and generating estimates.
            </p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Create First Quote
            </button>
          </div>
        )}

        {quotes.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td>
                      <Link href={`/quotes/${q.id}`} style={{color:"var(--gold)",fontWeight:600,textDecoration:"none"}}>
                        {q.quote_id}
                      </Link>
                    </td>
                    <td className="text-white">{q.customers?.name ?? "—"}</td>
                    <td className="text-xs">{q.quote_date}</td>
                    <td>
                      <span className="badge" style={{background:`${STATUS_COLOR[q.status]}22`,color:STATUS_COLOR[q.status]}}>
                        {q.status}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-white">
                      ${(q.total_amount ?? 0).toFixed(2)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/quotes/${q.id}`}
                          style={{padding:"3px 10px",borderRadius:6,border:"1px solid var(--border)",color:"var(--text-muted)",fontSize:11,textDecoration:"none"}}>
                          Details
                        </Link>
                        <Link href={`/quotes/${q.id}?tab=drawing`}
                          style={{padding:"3px 10px",borderRadius:6,background:"linear-gradient(135deg,#D4AF37,#A88B20)",color:"#000",fontWeight:600,fontSize:11,textDecoration:"none"}}>
                          ✏ Drawing
                        </Link>
                        <button onClick={()=>handleDelete(q.id)}
                          style={{padding:"3px 10px",borderRadius:6,border:"1px solid #7f1d1d",color:"#f87171",fontSize:11,background:"transparent",cursor:"pointer"}}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
