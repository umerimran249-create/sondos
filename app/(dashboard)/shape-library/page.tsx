"use client";

import { useState, useEffect, useRef } from "react";

interface ShapeTemplate {
  id: string;
  name: string;
  kind: string;
  stroke_color: string;
  image_data: string | null;
  default_width_ft: number;
  default_height_ft: number;
  default_corners: number;
  normalized_points: { x: number; y: number }[] | null;
  sort_order: number;
  created_at: string;
}

const KIND_OPTIONS = [
  { value: "countertop", label: "Countertop" },
  { value: "island",     label: "Island" },
  { value: "backsplash", label: "Backsplash" },
  { value: "cutout",     label: "Cutout" },
];

const PRESET_COLORS = [
  "#D4AF37", "#60a5fa", "#a855f7", "#fbbf24",
  "#f97316", "#4ade80", "#f87171", "#e2e8f0",
];

const EMPTY_FORM = {
  name: "",
  kind: "countertop",
  stroke_color: "#D4AF37",
  default_width_ft: "2.50",
  default_height_ft: "1.00",
  default_corners: "4",
  normalized_points_raw: "",
  image_data: null as string | null,
};

/** Compress + resize an image file to a small base64 thumbnail */
function compressImage(file: File, maxW = 320, maxH = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png", 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ShapeLibraryPage() {
  const [templates, setTemplates] = useState<ShapeTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [formOpen, setFormOpen]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/shape-templates");
    const j   = await res.json();
    setTemplates(j.templates ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function notify(ok: boolean, msg: string) {
    if (ok) { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); }
    else    { setError(msg);   setTimeout(() => setError(null),   4000); }
  }

  async function handleImageUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify(false, "Image too large — max 5 MB"); return; }
    try {
      const compressed = await compressImage(file);
      setForm(f => ({ ...f, image_data: compressed }));
    } catch {
      notify(false, "Could not read image — try a different file.");
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { notify(false, "Shape name is required."); return; }
    const widthFt  = parseFloat(form.default_width_ft);
    const heightFt = parseFloat(form.default_height_ft);
    if (isNaN(widthFt)  || widthFt  <= 0) { notify(false, "Width must be a positive number."); return; }
    if (isNaN(heightFt) || heightFt <= 0) { notify(false, "Height must be a positive number."); return; }

    let normalizedPoints = null;
    if (form.normalized_points_raw.trim()) {
      try { normalizedPoints = JSON.parse(form.normalized_points_raw.trim()); }
      catch { notify(false, "Outline Points JSON is invalid. Check the format."); return; }
    }

    setSaving(true);
    try {
      const body = {
        name:              form.name.trim(),
        kind:              form.kind,
        stroke_color:      form.stroke_color,
        image_data:        form.image_data,
        default_width_ft:  widthFt,
        default_height_ft: heightFt,
        default_corners:   parseInt(form.default_corners) || 4,
        normalized_points: normalizedPoints,
      };
      const res = await fetch("/api/shape-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      notify(true, `"${form.name}" added to Shape Library!`);
      setForm({ ...EMPTY_FORM });
      setFormOpen(false);
      load();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" from the Shape Library?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/shape-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      notify(true, `"${name}" removed.`);
      load();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setDeleting(null);
    }
  }

  const kindColor: Record<string, string> = {
    countertop: "#D4AF37", island: "#60a5fa",
    backsplash: "#a855f7", cutout: "#f97316",
  };

  return (
    <div className="space-y-6">

      {/* Toast notifications */}
      {(success || error) && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:9999,
          background: success ? "#0d2818" : "#2a0d0d",
          border: `1px solid ${success ? "#22c55e" : "#ef4444"}`,
          color: success ? "#86efac" : "#fca5a5",
          borderRadius:10, padding:"12px 20px", fontSize:13, fontWeight:500,
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
          maxWidth:360,
        }}>
          {success || error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Shape Library</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-muted)" }}>
            Custom shapes appear in the Drawing Tool and Quote Canvas.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="btn-primary"
          style={{ display:"flex", alignItems:"center", gap:8 }}
        >
          {formOpen ? "✕ Cancel" : "+ Add New Shape"}
        </button>
      </div>

      {/* ── ADD FORM ── */}
      {formOpen && (
        <div className="card" style={{ border:"1px solid #2a3550" }}>
          <h2 className="text-sm font-semibold text-white mb-5">New Shape</h2>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Shape Name *
              </label>
              <input className="input" placeholder="e.g. Peninsula" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Kind */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Type
              </label>
              <select className="input" value={form.kind}
                onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
                {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Width */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Default Width (ft)
              </label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="2.50"
                value={form.default_width_ft}
                onChange={e => setForm(f => ({ ...f, default_width_ft: e.target.value }))} />
            </div>

            {/* Height */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Default Height (ft)
              </label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="1.00"
                value={form.default_height_ft}
                onChange={e => setForm(f => ({ ...f, default_height_ft: e.target.value }))} />
            </div>

            {/* Corners */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Default Corners
              </label>
              <input className="input" type="number" min="0" step="1" placeholder="4"
                value={form.default_corners}
                onChange={e => setForm(f => ({ ...f, default_corners: e.target.value }))} />
            </div>

            {/* Colour */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Border Colour
              </label>
              <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, stroke_color: c }))}
                    title={c}
                    style={{
                      width:22, height:22, borderRadius:"50%", background:c, border:"none", cursor:"pointer",
                      outline: form.stroke_color === c ? `3px solid ${c}` : "none",
                      outlineOffset:2,
                    }} />
                ))}
                <input type="color" value={form.stroke_color}
                  onChange={e => setForm(f => ({ ...f, stroke_color: e.target.value }))}
                  style={{ width:28, height:28, borderRadius:6, border:"1px solid #2a2a2a", cursor:"pointer", padding:2, background:"transparent" }} />
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div style={{ marginTop:16 }}>
            <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
              Shape Image (optional)
            </label>
            <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width:160, height:110, border:`2px dashed ${form.image_data ? form.stroke_color : "#2a3550"}`,
                  borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                  background:"#060d18", overflow:"hidden", flexShrink:0,
                  transition:"border-color .2s",
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f)handleImageUpload(f); }}
              >
                {form.image_data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_data} alt="preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                ) : (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>🖼️</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>Click or drag image here</div>
                    <div style={{ fontSize:10, color:"#374151", marginTop:3 }}>PNG, JPG, SVG — max 5 MB</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={e => { const f=e.target.files?.[0]; if(f) handleImageUpload(f); }} />
              {form.image_data && (
                <button onClick={() => setForm(f => ({ ...f, image_data: null }))}
                  style={{ padding:"5px 12px", borderRadius:6, background:"#2a0d0d", color:"#f87171", border:"1px solid #ef4444", fontSize:12, cursor:"pointer" }}>
                  Remove image
                </button>
              )}
            </div>
          </div>

          {/* Outline points (optional, advanced) */}
          <details style={{ marginTop:16 }}>
            <summary style={{ fontSize:12, color:"var(--text-muted)", cursor:"pointer", userSelect:"none" }}>
              ▸ Advanced — Polygon Outline Points (for exact sqft on non-rectangular shapes)
            </summary>
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:"#4b6080", marginBottom:6, lineHeight:1.6 }}>
                Paste a JSON array of points where <code style={{color:"#D4AF37"}}>x</code> and <code style={{color:"#D4AF37"}}>y</code> are between 0 and 1
                (0 = top/left edge, 1 = bottom/right edge of the bounding box). Trace the shape outline clockwise.<br/>
                Example for an L-shape: <code style={{color:"#9ca3af", fontSize:10}}>[{"{"}x:0,y:0{"}"},{"{"}x:1,y:0{"}"},{"{"}x:1,y:0.33{"}"},{"{"}x:0.42,y:0.33{"}"},{"{"}x:0.42,y:1{"}"},{"{"}x:0,y:1{"}"}]</code>
              </div>
              <textarea className="input" rows={3} placeholder='[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1},{"x":0,"y":1}]'
                value={form.normalized_points_raw}
                onChange={e => setForm(f => ({ ...f, normalized_points_raw: e.target.value }))}
                style={{ fontFamily:"monospace", fontSize:11 }} />
            </div>
          </details>

          {/* Save button */}
          <div style={{ marginTop:20, display:"flex", gap:10, alignItems:"center" }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth:140 }}
            >
              {saving ? "Saving…" : "💾 Save Shape"}
            </button>
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setFormOpen(false); }}
              style={{ padding:"8px 16px", borderRadius:8, background:"transparent", color:"var(--text-muted)", border:"1px solid #2a2a2a", fontSize:13, cursor:"pointer" }}>
              Cancel
            </button>
            {/* Preview of the colour/name */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:form.stroke_color }} />
              <span style={{ fontSize:12, color:"#9ca3af" }}>{form.name || "Shape name"} · {form.default_width_ft} × {form.default_height_ft} ft</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SHAPE GRID ── */}
      {loading ? (
        <div className="card text-center py-10" style={{ color:"var(--text-muted)" }}>Loading shapes…</div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-12">
          <div style={{ fontSize:48, marginBottom:12 }}>🧩</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:6 }}>No shapes yet</div>
          <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>
            Add your first custom shape above. It will appear in the Drawing Tool and Quote Canvas automatically.
          </p>
          <button className="btn-primary" onClick={() => setFormOpen(true)}>+ Add First Shape</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding:0, overflow:"hidden" }}>

              {/* Image / colour preview */}
              <div style={{
                height:130, background:"#060d18",
                display:"flex", alignItems:"center", justifyContent:"center",
                borderBottom:`2px solid ${t.stroke_color}`,
                position:"relative",
              }}>
                {t.image_data ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image_data} alt={t.name}
                    style={{ maxWidth:"90%", maxHeight:"90%", objectFit:"contain" }} />
                ) : (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:4, opacity:0.4 }}>⬜</div>
                    <div style={{ fontSize:10, color:"#374151" }}>No image</div>
                  </div>
                )}
                {/* Kind badge */}
                <div style={{
                  position:"absolute", top:8, right:8,
                  background:`${kindColor[t.kind] ?? "#D4AF37"}22`,
                  color: kindColor[t.kind] ?? "#D4AF37",
                  fontSize:9, fontWeight:700, letterSpacing:"0.05em",
                  padding:"2px 7px", borderRadius:99, textTransform:"uppercase",
                  border:`1px solid ${kindColor[t.kind] ?? "#D4AF37"}44`,
                }}>
                  {t.kind}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:t.stroke_color, flexShrink:0 }} />
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {t.name}
                  </div>
                </div>
                <div style={{ fontSize:11, color:"var(--text-muted)" }}>
                  {Number(t.default_width_ft).toFixed(2)} ft × {Number(t.default_height_ft).toFixed(2)} ft
                </div>
                <div style={{ fontSize:10, color:"#374151", marginTop:2 }}>
                  {Number(t.default_corners)} corners
                  {t.normalized_points ? " · polygon outline ✓" : ""}
                </div>
              </div>

              {/* Delete */}
              <div style={{ padding:"0 14px 12px" }}>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={deleting === t.id}
                  style={{
                    width:"100%", padding:"6px", borderRadius:6, fontSize:11, fontWeight:600,
                    background:"transparent", color:"#f87171", border:"1px solid #ef444430",
                    cursor:"pointer", transition:"all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background="#2a0d0d"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
                >
                  {deleting === t.id ? "Deleting…" : "🗑 Delete Shape"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions card */}
      <div className="card" style={{ borderColor:"#1a2438" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color:"var(--gold)" }}>
          How it works
        </h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
          {[
            ["1. Add a shape here", "Upload an image, set dimensions, and click Save Shape."],
            ["2. Open Drawing Tool", "Your shape appears in the \"My Shapes\" panel on the left."],
            ["3. Click to place", "Click the shape thumbnail to drop it on the canvas at your set dimensions."],
            ["4. Edit on canvas", "Resize, move, assign a product colour, and manually enter exact W × H."],
          ].map(([title, desc]) => (
            <div key={title}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
