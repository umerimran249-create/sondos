"use client";

import { useState } from "react";

interface Field { key: string; label: string; type?: string; options?: string[] }

interface Props {
  title: string;
  fields: Field[];
  values: Record<string, any>;
  onSave: (updated: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

export function EditModal({ title, fields, values, onSave, onClose }: Props) {
  const [form, setForm] = useState<Record<string,any>>({ ...values });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#13161d", border:"1px solid #1e2333",
        borderRadius:14, width:"100%", maxWidth:520,
        boxShadow:"0 20px 60px rgba(0,0,0,0.6)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e2333", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:15, fontWeight:700, color:"white" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {fields.map(f => (
              <div key={f.key} style={{ gridColumn: f.type === "textarea" ? "span 2" : undefined }}>
                <label className="label">{f.label}</label>
                {f.options ? (
                  <select className="input" value={form[f.key] ?? ""} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea className="input" rows={2} value={form[f.key] ?? ""} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} />
                ) : (
                  <input type={f.type ?? "text"} className="input" value={form[f.key] ?? ""} onChange={e => setForm(p => ({...p,[f.key]: f.type==="number" ? Number(e.target.value) : e.target.value}))} />
                )}
              </div>
            ))}
          </div>
          {error && <p style={{ fontSize:12, color:"#f87171", marginTop:10 }}>{error}</p>}
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex:1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
