"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Product = { id:string; product_id:string; product_name:string; sku:string|null; color:string|null; country_of_origin:string|null; product_group:string|null; unit_type:string|null; base_cost:number|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());

function colorDot(color:string) {
  const c = color.toLowerCase();
  if (c.includes("black")) return "#1a1a1a";
  if (c.includes("white")) return "#f5f5f5";
  if (c.includes("grey")||c.includes("gray")) return "#9ca3af";
  if (c.includes("beige")||c.includes("cream")) return "#d4b896";
  if (c.includes("brown")) return "#92400e";
  if (c.includes("blue")) return "#3b82f6";
  if (c.includes("green")) return "#22c55e";
  if (c.includes("red")||c.includes("rosa")) return "#ef4444";
  if (c.includes("gold")||c.includes("yellow")) return "#D4AF37";
  if (c.includes("pink")) return "#f472b6";
  return "#6b7280";
}

export default function ProductsPage() {
  const { data, mutate } = useSWR<{ products: Product[] }>("/api/products", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id:"", product_name:"", sku:"", color:"", country_of_origin:"", product_group:"slab", unit_type:"sqft", base_cost:0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const products = (data?.products ?? []).filter(p => {
    const q = search.toLowerCase();
    return !q || p.product_name.toLowerCase().includes(q) || p.product_id.toLowerCase().includes(q) || p.color?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/products/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setDeleting(id);
    await fetch(`/api/products/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.product_name}`}
          fields={[
            { key:"product_id", label:"Product ID" },
            { key:"product_name", label:"Name" },
            { key:"sku", label:"SKU" },
            { key:"color", label:"Color" },
            { key:"country_of_origin", label:"Country of Origin" },
            { key:"product_group", label:"Group", options:["slab","tile","sink","accessory"] },
            { key:"unit_type", label:"Unit Type", options:["sqft","each","lf"] },
            { key:"base_cost", label:"Base Cost ($)", type:"number" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">Stone slabs, tiles, sinks and accessories</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ Add Product</button>
      </div>

      {showForm && (
        <div className="card max-w-xl">
          <h2 className="text-sm font-semibold mb-4 text-white">New product</h2>
          <form onSubmit={handleCreate} className="grid form-grid gap-3">
            {[["product_id","Product ID",true],["product_name","Name",true],["sku","SKU",false],["color","Color",false],["country_of_origin","Country of Origin",false]].map(([k,l,req])=>(
              <div key={k as string}><label className="label">{l as string}</label><input className="input" required={!!req} value={(form as any)[k as string]} onChange={e=>setForm(f=>({...f,[k as string]:e.target.value}))} /></div>
            ))}
            <div><label className="label">Group</label>
              <select className="input" value={form.product_group} onChange={e=>setForm(f=>({...f,product_group:e.target.value}))}>
                {["slab","tile","sink","accessory"].map(g=><option key={g}>{g}</option>)}
              </select></div>
            <div><label className="label">Unit Type</label>
              <select className="input" value={form.unit_type} onChange={e=>setForm(f=>({...f,unit_type:e.target.value}))}>
                {["sqft","each","lf"].map(u=><option key={u}>{u}</option>)}
              </select></div>
            <div><label className="label">Base Cost ($)</label><input type="number" className="input" value={form.base_cost} onChange={e=>setForm(f=>({...f,base_cost:Number(e.target.value)}))} /></div>
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
          <input className="input max-w-xs" placeholder="Search name, ID, color, SKU…" value={search} onChange={e=>setSearch(e.target.value)} />
          <span className="text-xs" style={{color:"var(--text-muted)"}}>{products.length} products</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>SKU</th><th>Color</th><th>Origin</th><th>Group</th><th className="text-right">Base Cost</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={{color:"var(--gold)"}} className="font-mono text-xs">{p.product_id}</td>
                  <td className="font-medium text-white">{p.product_name}</td>
                  <td className="text-xs">{p.sku ?? "—"}</td>
                  <td>
                    {p.color ? (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:colorDot(p.color),border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}} />
                        <span className="text-xs">{p.color}</span>
                      </div>
                    ) : <span className="text-xs">—</span>}
                  </td>
                  <td className="text-xs">{p.country_of_origin ?? "—"}</td>
                  <td><span className="badge badge-gray capitalize">{p.product_group ?? "—"}</span></td>
                  <td className="text-right">${(p.base_cost??0).toFixed(2)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(p)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===p.id} onClick={()=>handleDelete(p.id)}>{deleting===p.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={8} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
