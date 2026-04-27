"use client";

import useSWR from "swr";
import { useState, useRef } from "react";
import { EditModal } from "@/components/EditModal";

type Item = {
  id: string; inventory_id: string; lot_number: string|null; bundle_number: string|null;
  barcode: string|null; quantity: number; sqft: number;
  slab_width: number|null; slab_height: number|null; slab_thickness: number|null;
  image_data: string|null;
  status: string; products: { product_name: string; color: string|null } | null;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());
const STATUS_COLOR: Record<string, string> = {
  available: "badge-green", on_hold: "badge-gold", sold: "badge-red",
  damaged: "badge-red", reserved: "badge-blue",
};

function colorDot(color: string) {
  const c = color.toLowerCase();
  if (c.includes("black"))  return "#1a1a1a";
  if (c.includes("white"))  return "#f5f5f5";
  if (c.includes("grey") || c.includes("gray")) return "#9ca3af";
  if (c.includes("beige") || c.includes("cream")) return "#d4b896";
  if (c.includes("brown"))  return "#92400e";
  if (c.includes("blue"))   return "#3b82f6";
  if (c.includes("green"))  return "#22c55e";
  if (c.includes("red") || c.includes("rosa")) return "#ef4444";
  if (c.includes("gold") || c.includes("yellow")) return "#D4AF37";
  if (c.includes("pink"))   return "#f472b6";
  return "#6b7280";
}

/** Compress image file to base64 thumbnail */
function compressImage(file: File, maxW = 400, maxH = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InventoryPage() {
  const { data, mutate } = useSWR<{ inventory: Item[] }>("/api/inventory", fetcher);
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    inventory_id: "", lot_number: "", bundle_number: "", barcode: "",
    quantity: 1, sqft: 0, slab_width: 0, slab_height: 0, slab_thickness: 0,
    image_data: null as string | null,
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [imagePopup, setImagePopup] = useState<{ src: string; label: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = (data?.inventory ?? []).filter(i => {
    const q = search.toLowerCase();
    return !q
      || i.inventory_id.toLowerCase().includes(q)
      || i.products?.product_name.toLowerCase().includes(q)
      || i.lot_number?.toLowerCase().includes(q)
      || i.barcode?.toLowerCase().includes(q);
  });

  async function handleImageUpload(file: File) {
    if (file.size > 8 * 1024 * 1024) { setError("Image too large — max 8 MB"); return; }
    try {
      const compressed = await compressImage(file);
      setForm(f => ({ ...f, image_data: compressed }));
    } catch {
      setError("Could not read image — try a different file.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false);
    setForm({ inventory_id:"", lot_number:"", bundle_number:"", barcode:"", quantity:1, sqft:0, slab_width:0, slab_height:0, slab_thickness:0, image_data:null });
    mutate();
  }

  async function handleEdit(updated: Record<string, any>) {
    const res = await fetch(`/api/inventory/${editing!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inventory item?")) return;
    setDeleting(id);
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setDeleting(null); mutate();
  }

  const totalSqft = items.reduce((s, i) => s + (i.sqft ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* Image popup lightbox */}
      {imagePopup && (
        <div
          onClick={() => setImagePopup(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "#0d1421", borderRadius: 16,
            border: "1px solid #2a3550", overflow: "hidden",
            maxWidth: "90vw", maxHeight: "90vh",
            boxShadow: "0 0 80px rgba(212,175,55,0.15)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #1a2438",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{imagePopup.label}</span>
              <button
                onClick={() => setImagePopup(null)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
              >✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePopup.src}
              alt={imagePopup.label}
              style={{ maxWidth: "85vw", maxHeight: "78vh", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      )}

      {editing && (
        <EditModal
          title={`Edit — ${editing.inventory_id}`}
          fields={[
            { key: "inventory_id",   label: "Inventory ID" },
            { key: "lot_number",     label: "Lot #" },
            { key: "bundle_number",  label: "Bundle #" },
            { key: "barcode",        label: "Barcode" },
            { key: "quantity",       label: "Quantity",        type: "number" },
            { key: "sqft",           label: "Total Sqft",      type: "number" },
            { key: "slab_width",     label: "Width (in)",      type: "number" },
            { key: "slab_height",    label: "Height (in)",     type: "number" },
            { key: "slab_thickness", label: "Thickness (cm)",  type: "number" },
            { key: "status", label: "Status", options: ["available","on_hold","reserved","sold","damaged"] },
          ]}
          values={editing}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Slabs, bundles and stock tracking</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>+ Add Slab</button>
      </div>

      <div className="stats-grid-3">
        <div className="stat-card"><div className="stat-label">Total Slabs</div><div className="stat-value">{items.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Sqft</div><div className="stat-value" style={{ color:"var(--gold)" }}>{totalSqft.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-label">Available</div><div className="stat-value text-green-400">{items.filter(i => i.status === "available").length}</div></div>
      </div>

      {showForm && (
        <div className="card max-w-2xl">
          <h2 className="text-sm font-semibold mb-4 text-white">Add slab</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid form-grid gap-3">
              {([["inventory_id","Inventory ID",true],["lot_number","Lot #",false],["bundle_number","Bundle #",false],["barcode","Barcode",false]] as [string,string,boolean][]).map(([k,l,req]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" required={req}
                    value={(form as any)[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div><label className="label">Qty</label><input type="number" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
              <div><label className="label">Total Sqft</label><input type="number" className="input" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: Number(e.target.value) }))} /></div>
              <div><label className="label">Width (in)</label><input type="number" className="input" placeholder="e.g. 126" value={form.slab_width || ""} onChange={e => setForm(f => ({ ...f, slab_width: Number(e.target.value) }))} /></div>
              <div><label className="label">Height (in)</label><input type="number" className="input" placeholder="e.g. 63" value={form.slab_height || ""} onChange={e => setForm(f => ({ ...f, slab_height: Number(e.target.value) }))} /></div>
              <div><label className="label">Thickness (cm)</label><input type="number" className="input" placeholder="e.g. 2" value={form.slab_thickness || ""} onChange={e => setForm(f => ({ ...f, slab_thickness: Number(e.target.value) }))} /></div>
            </div>

            {/* Image upload */}
            <div>
              <label className="label">Slab Image (optional)</label>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
                  style={{
                    width: 160, height: 110,
                    border: `2px dashed ${form.image_data ? "#D4AF37" : "#2a3550"}`,
                    borderRadius: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#060d18", overflow: "hidden", flexShrink: 0,
                    transition: "border-color .2s",
                  }}
                >
                  {form.image_data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image_data} alt="preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  ) : (
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:28, marginBottom:6 }}>🖼️</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)" }}>Click or drag image</div>
                      <div style={{ fontSize:10, color:"#374151", marginTop:3 }}>PNG, JPG — max 8 MB</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                {form.image_data && (
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, image_data: null }))}
                    style={{ padding:"5px 12px", borderRadius:6, background:"#2a0d0d", color:"#f87171", border:"1px solid #ef4444", fontSize:12, cursor:"pointer" }}>
                    Remove image
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <input className="input max-w-xs" placeholder="Search product, lot, barcode…" value={search} onChange={e => setSearch(e.target.value)} />
          <span className="text-xs" style={{ color:"var(--text-muted)" }}>{items.length} items</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>ID</th>
                <th>Product</th>
                <th>Dimensions</th>
                <th>Lot / Bundle</th>
                <th>Barcode</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Sqft</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>
                    {i.image_data ? (
                      <button
                        onClick={() => setImagePopup({ src: i.image_data!, label: `${i.inventory_id}${i.products?.product_name ? ` — ${i.products.product_name}` : ""}` })}
                        style={{ background:"none", border:"none", padding:0, cursor:"zoom-in" }}
                        title="Click to view full image"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.image_data} alt={i.inventory_id}
                          style={{ width:44, height:36, objectFit:"cover", borderRadius:5, border:"1px solid #2a3550", display:"block" }} />
                      </button>
                    ) : (
                      <div style={{ width:44, height:36, borderRadius:5, background:"#0d1421", border:"1px solid #1a2438", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:14, opacity:0.3 }}>🪨</span>
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-xs" style={{ color:"var(--gold)" }}>{i.inventory_id}</td>
                  <td>
                    <div className="font-medium text-white">{i.products?.product_name ?? "—"}</div>
                    {i.products?.color && (
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:colorDot(i.products.color), flexShrink:0 }} />
                        <span className="text-xs" style={{ color:"var(--text-muted)" }}>{i.products.color}</span>
                      </div>
                    )}
                  </td>
                  <td className="text-xs">
                    {i.slab_width && i.slab_height
                      ? <span style={{ color:"var(--gold)", fontWeight:600 }}>{i.slab_width}" × {i.slab_height}"{i.slab_thickness ? ` × ${i.slab_thickness}cm` : ""}</span>
                      : <span style={{ color:"var(--text-muted)" }}>—</span>}
                  </td>
                  <td className="text-xs">{[i.lot_number, i.bundle_number].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="text-xs font-mono">{i.barcode ?? "—"}</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right">{(i.sqft ?? 0).toFixed(1)}</td>
                  <td><span className={`badge ${STATUS_COLOR[i.status] ?? "badge-gray"}`}>{i.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{ padding:"2px 10px", fontSize:11 }} onClick={() => setEditing(i)}>Edit</button>
                      <button className="btn-danger" style={{ padding:"2px 10px", fontSize:11 }} disabled={deleting === i.id} onClick={() => handleDelete(i.id)}>{deleting === i.id ? "…" : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={10} className="py-10 text-center" style={{ color:"var(--text-muted)" }}>No inventory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
