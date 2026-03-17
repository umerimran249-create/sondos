"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Order = { id:string; order_number:string; status:string; deposit_amount:number; created_at:string; customers:{name:string}|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());
const STATUS_COLOR: Record<string,string> = { pending:"badge-gray", confirmed:"badge-blue", in_production:"badge-gold", ready:"badge-green", delivered:"badge-green", cancelled:"badge-red" };

export default function SalesOrdersPage() {
  const { data, mutate } = useSWR<{ orders: Order[] }>("/api/sales-orders", fetcher);
  const { data: custData } = useSWR<{ customers:{id:string,name:string}[] }>("/api/customers", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_number:"", customer_id:"", deposit_amount:0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [editing, setEditing] = useState<Order|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const orders = data?.orders ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/sales-orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/sales-orders/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sales order?")) return;
    setDeleting(id);
    await fetch(`/api/sales-orders/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.order_number}`}
          fields={[
            { key:"order_number",   label:"Order #" },
            { key:"status",         label:"Status", options:["pending","confirmed","in_production","ready","delivered","cancelled"] },
            { key:"deposit_amount", label:"Deposit ($)", type:"number" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Sales Orders</h1><p className="page-subtitle">Track orders from confirmation to delivery</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ New Order</button>
      </div>

      <div className="stats-grid">
        {["pending","confirmed","in_production","delivered"].map(s=>(
          <div key={s} className="stat-card"><div className="stat-label capitalize">{s.replace("_"," ")}</div><div className="stat-value">{orders.filter(o=>o.status===s).length}</div></div>
        ))}
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New order</h2>
          <form onSubmit={handleCreate} className="grid form-grid gap-3">
            <div className="col-span-2"><label className="label">Order #</label><input className="input" required value={form.order_number} onChange={e=>setForm(f=>({...f,order_number:e.target.value}))} /></div>
            <div><label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))}>
                <option value="">— select —</option>
                {custData?.customers?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="label">Deposit ($)</label><input type="number" className="input" value={form.deposit_amount} onChange={e=>setForm(f=>({...f,deposit_amount:Number(e.target.value)}))} /></div>
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
            <thead><tr><th>Order #</th><th>Customer</th><th>Status</th><th className="text-right">Deposit</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td style={{color:"var(--gold)"}} className="font-semibold">{o.order_number}</td>
                  <td className="text-white">{o.customers?.name ?? "—"}</td>
                  <td><span className={`badge ${STATUS_COLOR[o.status]??"badge-gray"}`}>{o.status}</span></td>
                  <td className="text-right">${(o.deposit_amount??0).toFixed(2)}</td>
                  <td className="text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(o)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===o.id} onClick={()=>handleDelete(o.id)}>{deleting===o.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={6} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No orders.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
