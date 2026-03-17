"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Customer = { id:string; customer_id:string; name:string; phone:string|null; email:string|null; customer_type:string|null; credit_limit:number; status:string; notes:string|null; is_locked:boolean };

const fetcher = (url:string) => fetch(url).then(r=>r.json());

export default function CustomersPage() {
  const { data, mutate } = useSWR<{ customers: Customer[] }>("/api/customers", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id:"", name:"", phone:"", email:"", customer_type:"homeowner", credit_limit:5000, notes:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const customers = (data?.customers ?? []).filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/customers", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setForm({ customer_id:"", name:"", phone:"", email:"", customer_type:"homeowner", credit_limit:5000, notes:"" });
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/customers/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/customers/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.name}`}
          fields={[
            { key:"customer_id", label:"Customer ID" },
            { key:"name", label:"Name" },
            { key:"phone", label:"Phone" },
            { key:"email", label:"Email" },
            { key:"customer_type", label:"Type", options:["homeowner","fabricator","designer","contractor"] },
            { key:"credit_limit", label:"Credit Limit ($)", type:"number" },
            { key:"status", label:"Status", options:["active","inactive"] },
            { key:"notes", label:"Notes", type:"textarea" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Customers</h1><p className="page-subtitle">Manage your customer database</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ Add Customer</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{(data?.customers??[]).length}</div></div>
        <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value" style={{color:"var(--gold)"}}>{(data?.customers??[]).filter(c=>c.status==="active").length}</div></div>
        <div className="stat-card"><div className="stat-label">Locked</div><div className="stat-value text-red-400">{(data?.customers??[]).filter(c=>c.is_locked).length}</div></div>
      </div>

      {showForm && (
        <div className="card max-w-xl">
          <h2 className="text-sm font-semibold mb-4 text-white">New customer</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div><label className="label">Customer ID</label><input className="input" required value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))} /></div>
            <div><label className="label">Name</label><input className="input" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.customer_type} onChange={e=>setForm(f=>({...f,customer_type:e.target.value}))}>
                {["homeowner","fabricator","designer","contractor"].map(t=><option key={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Credit Limit ($)</label><input type="number" className="input" value={form.credit_limit} onChange={e=>setForm(f=>({...f,credit_limit:Number(e.target.value)}))} /></div>
            <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
            {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
            <div className="col-span-2 flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving?"Saving…":"Save"}</button>
              <button type="button" className="btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <input className="input max-w-xs" placeholder="Search name, ID, email…" value={search} onChange={e=>setSearch(e.target.value)} />
          <span className="text-xs" style={{color:"var(--text-muted)"}}>{customers.length} customers</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Phone</th><th>Email</th><th className="text-right">Credit Limit</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{color:"var(--gold)"}} className="font-mono text-xs">{c.customer_id}</td>
                  <td className="font-medium text-white">{c.name}{c.is_locked && <span className="badge badge-red ml-2">Locked</span>}</td>
                  <td className="text-xs capitalize">{c.customer_type ?? "—"}</td>
                  <td className="text-xs">{c.phone ?? "—"}</td>
                  <td className="text-xs">{c.email ?? "—"}</td>
                  <td className="text-right">${(c.credit_limit??0).toLocaleString()}</td>
                  <td><span className={`badge ${c.status==="active"?"badge-green":"badge-gray"}`}>{c.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(c)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===c.id} onClick={()=>handleDelete(c.id)}>{deleting===c.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!customers.length && <tr><td colSpan={8} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
