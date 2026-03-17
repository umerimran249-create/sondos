"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Item = { id:string; inventory_id:string; lot_number:string|null; bundle_number:string|null; barcode:string|null; quantity:number; sqft:number; status:string; products:{product_name:string;color:string|null}|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());
const STATUS_COLOR: Record<string,string> = { available:"badge-green", on_hold:"badge-gold", sold:"badge-red", damaged:"badge-red", reserved:"badge-blue" };

export default function InventoryPage() {
  const { data, mutate } = useSWR<{ inventory: Item[] }>("/api/inventory", fetcher);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ inventory_id:"", lot_number:"", bundle_number:"", barcode:"", quantity:1, sqft:0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [editing, setEditing] = useState<Item|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const items = (data?.inventory ?? []).filter(i => {
    const q = search.toLowerCase();
    return !q || i.inventory_id.toLowerCase().includes(q) || i.products?.product_name.toLowerCase().includes(q) || i.lot_number?.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/inventory", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/inventory/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inventory item?")) return;
    setDeleting(id);
    await fetch(`/api/inventory/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  const totalSqft = items.reduce((s,i) => s+(i.sqft??0), 0);

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.inventory_id}`}
          fields={[
            { key:"inventory_id", label:"Inventory ID" },
            { key:"lot_number",   label:"Lot #" },
            { key:"bundle_number",label:"Bundle #" },
            { key:"barcode",      label:"Barcode" },
            { key:"quantity",     label:"Quantity", type:"number" },
            { key:"sqft",         label:"Sqft",     type:"number" },
            { key:"status", label:"Status", options:["available","on_hold","reserved","sold","damaged"] },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-subtitle">Slabs, bundles and stock tracking</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ Add Slab</button>
      </div>

      <div className="stats-grid-3">
        <div className="stat-card"><div className="stat-label">Total Slabs</div><div className="stat-value">{items.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Sqft</div><div className="stat-value" style={{color:"var(--gold)"}}>{totalSqft.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-label">Available</div><div className="stat-value text-green-400">{items.filter(i=>i.status==="available").length}</div></div>
      </div>

      {showForm && (
        <div className="card max-w-xl">
          <h2 className="text-sm font-semibold mb-4 text-white">Add slab</h2>
          <form onSubmit={handleCreate} className="grid form-grid gap-3">
            {[["inventory_id","Inventory ID",true],["lot_number","Lot #",false],["bundle_number","Bundle #",false],["barcode","Barcode",false]].map(([k,l,req])=>(
              <div key={k as string}><label className="label">{l as string}</label><input className="input" required={!!req} value={(form as any)[k as string]} onChange={e=>setForm(f=>({...f,[k as string]:e.target.value}))} /></div>
            ))}
            <div><label className="label">Qty</label><input type="number" className="input" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:Number(e.target.value)}))} /></div>
            <div><label className="label">Sqft</label><input type="number" className="input" value={form.sqft} onChange={e=>setForm(f=>({...f,sqft:Number(e.target.value)}))} /></div>
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
          <input className="input max-w-xs" placeholder="Search product, lot, barcode…" value={search} onChange={e=>setSearch(e.target.value)} />
          <span className="text-xs" style={{color:"var(--text-muted)"}}>{items.length} items</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Lot / Bundle</th><th>Barcode</th><th className="text-right">Qty</th><th className="text-right">Sqft</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td className="font-mono text-xs" style={{color:"var(--gold)"}}>{i.inventory_id}</td>
                  <td><div className="font-medium text-white">{i.products?.product_name ?? "—"}</div>{i.products?.color && <div className="text-xs" style={{color:"var(--text-muted)"}}>{i.products.color}</div>}</td>
                  <td className="text-xs">{[i.lot_number,i.bundle_number].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="text-xs font-mono">{i.barcode ?? "—"}</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right">{(i.sqft??0).toFixed(1)}</td>
                  <td><span className={`badge ${STATUS_COLOR[i.status]??"badge-gray"}`}>{i.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(i)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===i.id} onClick={()=>handleDelete(i.id)}>{deleting===i.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={8} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No inventory.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
