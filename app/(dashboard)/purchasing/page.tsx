"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type PO = { id:string; po_number:string; supplier_name:string; status:string; order_type:string|null; expected_date:string|null; notes:string|null; created_at:string };

const fetcher = (url:string) => fetch(url).then(r=>r.json());
const STATUS_COLOR: Record<string,string> = { draft:"badge-gray", sent:"badge-blue", confirmed:"badge-gold", received:"badge-green", cancelled:"badge-red" };

export default function PurchasingPage() {
  const { data, mutate } = useSWR<{ purchase_orders: PO[] }>("/api/purchasing", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ po_number:"", supplier_name:"", order_type:"bundle", expected_date:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [editing, setEditing] = useState<PO|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const pos = data?.purchase_orders ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/purchasing", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/purchasing/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this PO?")) return;
    setDeleting(id);
    await fetch(`/api/purchasing/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.po_number}`}
          fields={[
            { key:"po_number",      label:"PO Number" },
            { key:"supplier_name",  label:"Supplier Name" },
            { key:"status", label:"Status", options:["draft","sent","confirmed","received","cancelled"] },
            { key:"order_type", label:"Order Type", options:["bundle","crate","sqft"] },
            { key:"expected_date",  label:"Expected Date", type:"date" },
            { key:"notes",          label:"Notes", type:"textarea" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Purchasing</h1><p className="page-subtitle">Manage purchase orders and receiving</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ New PO</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {["draft","sent","confirmed","received"].map(s=>(
          <div key={s} className="stat-card"><div className="stat-label capitalize">{s}</div><div className="stat-value">{pos.filter(p=>p.status===s).length}</div></div>
        ))}
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New purchase order</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div><label className="label">PO Number</label><input className="input" required value={form.po_number} onChange={e=>setForm(f=>({...f,po_number:e.target.value}))} /></div>
            <div><label className="label">Supplier Name</label><input className="input" required value={form.supplier_name} onChange={e=>setForm(f=>({...f,supplier_name:e.target.value}))} /></div>
            <div><label className="label">Order Type</label>
              <select className="input" value={form.order_type} onChange={e=>setForm(f=>({...f,order_type:e.target.value}))}>
                {["bundle","crate","sqft"].map(t=><option key={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Expected Date</label><input type="date" className="input" value={form.expected_date} onChange={e=>setForm(f=>({...f,expected_date:e.target.value}))} /></div>
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
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>PO #</th><th>Supplier</th><th>Type</th><th>Status</th><th>Expected</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {pos.map(p=>(
                <tr key={p.id}>
                  <td style={{color:"var(--gold)"}} className="font-semibold">{p.po_number}</td>
                  <td className="text-white">{p.supplier_name}</td>
                  <td><span className="badge badge-gray capitalize">{p.order_type ?? "—"}</span></td>
                  <td><span className={`badge ${STATUS_COLOR[p.status]??"badge-gray"}`}>{p.status}</span></td>
                  <td className="text-xs">{p.expected_date ?? "—"}</td>
                  <td className="text-xs max-w-xs truncate">{p.notes ?? "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(p)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===p.id} onClick={()=>handleDelete(p.id)}>{deleting===p.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pos.length && <tr><td colSpan={7} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No purchase orders.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
