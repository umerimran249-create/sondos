"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Delivery = { id:string; delivery_number:string; status:string; scheduled_date:string|null; driver_name:string|null; created_at:string; sales_orders:{order_number:string;customers:{name:string}|null}|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());
const STATUS_COLOR: Record<string,string> = { not_ready:"badge-gray", ready:"badge-green", out_for_delivery:"badge-blue", delivered:"badge-gold", cancelled:"badge-red" };

export default function DeliveriesPage() {
  const { data, mutate } = useSWR<{ deliveries: Delivery[] }>("/api/deliveries", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ delivery_number:"", scheduled_date:"", driver_name:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [editing, setEditing] = useState<Delivery|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const deliveries = data?.deliveries ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/deliveries", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/deliveries/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this delivery?")) return;
    setDeleting(id);
    await fetch(`/api/deliveries/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.delivery_number}`}
          fields={[
            { key:"delivery_number", label:"Delivery #" },
            { key:"status", label:"Status", options:["not_ready","ready","out_for_delivery","delivered","cancelled"] },
            { key:"scheduled_date", label:"Scheduled Date", type:"date" },
            { key:"driver_name",    label:"Driver Name" },
            { key:"notes",          label:"Notes", type:"textarea" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Deliveries</h1><p className="page-subtitle">Route planning and delivery tracking</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ New Delivery</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {["not_ready","ready","out_for_delivery","delivered"].map(s=>(
          <div key={s} className="stat-card"><div className="stat-label">{s.replace(/_/g," ")}</div><div className="stat-value">{deliveries.filter(d=>d.status===s).length}</div></div>
        ))}
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New delivery</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div><label className="label">Delivery #</label><input className="input" required value={form.delivery_number} onChange={e=>setForm(f=>({...f,delivery_number:e.target.value}))} /></div>
            <div><label className="label">Driver Name</label><input className="input" value={form.driver_name} onChange={e=>setForm(f=>({...f,driver_name:e.target.value}))} /></div>
            <div className="col-span-2"><label className="label">Scheduled Date</label><input type="date" className="input" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))} /></div>
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
            <thead><tr><th>Delivery #</th><th>Customer</th><th>Order #</th><th>Status</th><th>Scheduled</th><th>Driver</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map(d=>(
                <tr key={d.id}>
                  <td style={{color:"var(--gold)"}} className="font-semibold">{d.delivery_number}</td>
                  <td className="text-white">{d.sales_orders?.customers?.name ?? "—"}</td>
                  <td className="text-xs">{d.sales_orders?.order_number ?? "—"}</td>
                  <td><span className={`badge ${STATUS_COLOR[d.status]??"badge-gray"}`}>{d.status.replace(/_/g," ")}</span></td>
                  <td className="text-xs">{d.scheduled_date ?? "—"}</td>
                  <td className="text-xs">{d.driver_name ?? "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(d)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===d.id} onClick={()=>handleDelete(d.id)}>{deleting===d.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!deliveries.length && <tr><td colSpan={7} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No deliveries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
