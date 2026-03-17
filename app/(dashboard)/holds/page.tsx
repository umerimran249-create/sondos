"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Hold = { id:string; hold_id:string; hold_date:string; expiry_date:string|null; notes:string|null; is_active:boolean; customers:{name:string}|null; products:{product_name:string;color:string|null}|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());

export default function HoldsPage() {
  const { data, mutate } = useSWR<{ holds: Hold[] }>("/api/holds", fetcher);
  const { data: custData } = useSWR<{ customers:{id:string,name:string}[] }>("/api/customers", fetcher);
  const { data: prodData } = useSWR<{ products:{id:string,product_name:string}[] }>("/api/products", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hold_id:"", customer_id:"", product_id:"", expiry_date:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [tab, setTab] = useState<"active"|"all">("active");
  const [editing, setEditing] = useState<Hold|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const today = new Date().toISOString().split("T")[0];
  const holds = (data?.holds ?? []).filter(h => tab==="all" || h.is_active);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/holds", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/holds/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this hold?")) return;
    setDeleting(id);
    await fetch(`/api/holds/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  async function releaseHold(id:string) {
    await fetch(`/api/holds/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({is_active:false}) });
    mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.hold_id}`}
          fields={[
            { key:"hold_id",     label:"Hold ID" },
            { key:"hold_date",   label:"Hold Date",   type:"date" },
            { key:"expiry_date", label:"Expiry Date", type:"date" },
            { key:"notes",       label:"Notes",       type:"textarea" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Holds</h1><p className="page-subtitle">Reserve material for customers</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ New Hold</button>
      </div>

      <div className="stats-grid-3">
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value" style={{color:"var(--gold)"}}>{(data?.holds??[]).filter(h=>h.is_active).length}</div></div>
        <div className="stat-card"><div className="stat-label">Expiring Today</div><div className="stat-value text-red-400">{(data?.holds??[]).filter(h=>h.is_active&&h.expiry_date===today).length}</div></div>
        <div className="stat-card"><div className="stat-label">All Time</div><div className="stat-value">{(data?.holds??[]).length}</div></div>
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New hold</h2>
          <form onSubmit={handleCreate} className="grid form-grid gap-3">
            <div><label className="label">Hold ID</label><input className="input" required value={form.hold_id} onChange={e=>setForm(f=>({...f,hold_id:e.target.value}))} /></div>
            <div><label className="label">Expiry Date</label><input type="date" className="input" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))} /></div>
            <div><label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))}>
                <option value="">— select —</option>
                {custData?.customers?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="label">Product</label>
              <select className="input" value={form.product_id} onChange={e=>setForm(f=>({...f,product_id:e.target.value}))}>
                <option value="">— select —</option>
                {prodData?.products?.map(p=><option key={p.id} value={p.id}>{p.product_name}</option>)}
              </select></div>
            <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
            {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
            <div className="col-span-2 flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving?"Saving…":"Create"}</button>
              <button type="button" className="btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex gap-2 mb-4">
          {(["active","all"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={tab===t?"btn-primary":"btn-secondary"} style={{padding:"4px 14px",fontSize:12}}>
              {t==="active"?"Active":"All"}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Hold ID</th><th>Customer</th><th>Product</th><th>Hold Date</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {holds.map(h => {
                const expired = h.expiry_date && h.expiry_date < today;
                return (
                  <tr key={h.id}>
                    <td style={{color:"var(--gold)"}} className="font-semibold">{h.hold_id}</td>
                    <td className="text-white">{h.customers?.name ?? "—"}</td>
                    <td><div className="text-white">{h.products?.product_name ?? "—"}</div>{h.products?.color && <div className="text-xs" style={{color:"var(--text-muted)"}}>{h.products.color}</div>}</td>
                    <td className="text-xs">{h.hold_date}</td>
                    <td className="text-xs" style={{color:expired?"#f87171":undefined}}>{h.expiry_date ?? "—"}{expired ? " ⚠" : ""}</td>
                    <td><span className={`badge ${h.is_active?"badge-gold":"badge-gray"}`}>{h.is_active?"active":"released"}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(h)}>Edit</button>
                        {h.is_active && <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11,color:"#f97316"}} onClick={()=>releaseHold(h.id)}>Release</button>}
                        <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===h.id} onClick={()=>handleDelete(h.id)}>{deleting===h.id?"…":"Delete"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!holds.length && <tr><td colSpan={7} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No holds.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
