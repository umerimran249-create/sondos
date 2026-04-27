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
  default_width_in:  "30",   // inches — e.g. 30" = 2.5 ft
  default_height_in: "12",   // inches — e.g. 12" = 1.0 ft
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

// ──────────────────────────────────────────────
// Bulk import types
// ──────────────────────────────────────────────
interface BulkRow {
  name: string;
  kind: string;
  width_in: number;
  height_in: number;
  stroke_color: string;
  image_data: string | null;
}

const DEFAULT_BULK_KIND   = "countertop";
const DEFAULT_BULK_W      = 30;
const DEFAULT_BULK_H      = 24;
const DEFAULT_BULK_COLOR  = "#D4AF37";

/** Parse a raw CSV string into BulkRows. First row treated as header if it contains non-numeric name. */
function parseCsv(raw: string): BulkRow[] {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Detect header row — if the first cell isn't a number, treat as header
  let dataStart = 0;
  let headers: string[] = [];
  const firstCells = lines[0].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim().toLowerCase());
  if (isNaN(Number(firstCells[0]))) {
    headers = firstCells;
    dataStart = 1;
  } else {
    // No header: assume name, kind, width_in, height_in, stroke_color
    headers = ["name","kind","width_in","height_in","stroke_color"];
  }

  const idx = (key: string) => headers.indexOf(key);

  return lines.slice(dataStart).map(line => {
    const cells = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim());
    const get   = (key: string, fallback = "") => cells[idx(key)] ?? fallback;
    const nameVal = get("name") || get("shape name") || get("shape") || cells[0] || "";
    const kindRaw = (get("kind") || get("type") || "").toLowerCase();
    const validKinds = ["countertop","island","backsplash","cutout"];
    return {
      name:        nameVal,
      kind:        validKinds.includes(kindRaw) ? kindRaw : DEFAULT_BULK_KIND,
      width_in:    parseFloat(get("width_in") || get("width") || get("w")) || DEFAULT_BULK_W,
      height_in:   parseFloat(get("height_in") || get("height") || get("h")) || DEFAULT_BULK_H,
      stroke_color: get("stroke_color") || get("color") || get("colour") || DEFAULT_BULK_COLOR,
      image_data:  null,
    } as BulkRow;
  }).filter(r => r.name);
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

  // ── Bulk import state ──
  const [bulkOpen, setBulkOpen]     = useState(false);
  const [bulkTab, setBulkTab]       = useState<"images"|"csv">("images");
  const [bulkRows, setBulkRows]     = useState<BulkRow[]>([]);
  const [bulkCsv, setBulkCsv]       = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const bulkImgRef = useRef<HTMLInputElement>(null);
  const bulkCsvRef = useRef<HTMLInputElement>(null);

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
    const widthIn  = parseFloat(form.default_width_in);
    const heightIn = parseFloat(form.default_height_in);
    if (isNaN(widthIn)  || widthIn  <= 0) { notify(false, "Width must be a positive number (in inches)."); return; }
    if (isNaN(heightIn) || heightIn <= 0) { notify(false, "Height must be a positive number (in inches)."); return; }

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
        default_width_ft:  widthIn  / 12,   // store as feet in DB
        default_height_ft: heightIn / 12,   // store as feet in DB
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

  // ── Bulk: process multiple images dropped/selected ──
  async function handleBulkImages(files: FileList | null) {
    if (!files || !files.length) return;
    const newRows: BulkRow[] = [];
    for (const file of Array.from(files)) {
      const nameFromFile = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      let imgData: string | null = null;
      try { imgData = await compressImage(file, 320, 240); } catch { /* skip */ }
      newRows.push({
        name:        nameFromFile,
        kind:        DEFAULT_BULK_KIND,
        width_in:    DEFAULT_BULK_W,
        height_in:   DEFAULT_BULK_H,
        stroke_color: DEFAULT_BULK_COLOR,
        image_data:  imgData,
      });
    }
    setBulkRows(prev => [...prev, ...newRows]);
  }

  // ── Bulk: parse CSV text → rows ──
  function handleParseCsv() {
    const rows = parseCsv(bulkCsv);
    if (!rows.length) { notify(false, "No valid rows found — check your CSV format."); return; }
    setBulkRows(rows);
    notify(true, `${rows.length} shape(s) ready to import.`);
  }

  // ── Bulk: upload CSV file ──
  async function handleCsvFile(file: File) {
    const text = await file.text();
    setBulkCsv(text);
    const rows = parseCsv(text);
    setBulkRows(rows);
    if (rows.length) notify(true, `${rows.length} shape(s) ready to import.`);
    else notify(false, "No valid rows found in this CSV file.");
  }

  // ── Bulk: send all rows to API ──
  async function handleBulkImport() {
    if (!bulkRows.length) return;
    setBulkImporting(true);
    try {
      const items = bulkRows.map(r => ({
        name:              r.name,
        kind:              r.kind,
        stroke_color:      r.stroke_color,
        image_data:        r.image_data,
        default_width_ft:  r.width_in  / 12,
        default_height_ft: r.height_in / 12,
        default_corners:   4,
      }));
      const res = await fetch("/api/shape-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Import failed");
      notify(true, `${j.inserted} shape(s) imported successfully!`);
      setBulkRows([]);
      setBulkCsv("");
      setBulkOpen(false);
      load();
    } catch (e: any) {
      notify(false, e.message);
    } finally {
      setBulkImporting(false);
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
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button
            onClick={() => { setBulkOpen(o => !o); setFormOpen(false); }}
            style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer",
              background: bulkOpen ? "#1a2438" : "transparent",
              color: bulkOpen ? "#fff" : "var(--text-muted)",
              border:"1px solid #2a3550", transition:"all .15s",
            }}
          >
            {bulkOpen ? "✕ Close Bulk Import" : "📦 Bulk Import"}
          </button>
          <button
            onClick={() => { setFormOpen(o => !o); setBulkOpen(false); }}
            className="btn-primary"
            style={{ display:"flex", alignItems:"center", gap:8 }}
          >
            {formOpen ? "✕ Cancel" : "+ Add New Shape"}
          </button>
        </div>
      </div>

      {/* ── BULK IMPORT PANEL ── */}
      {bulkOpen && (
        <div className="card" style={{ border:"1px solid #2a3550" }}>
          <h2 className="text-sm font-semibold text-white mb-1">Bulk Import Shapes</h2>
          <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16 }}>
            Import many shapes at once — either by uploading multiple images, or by pasting a CSV list.
          </p>

          {/* Tabs */}
          <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid #1a2438" }}>
            {(["images","csv"] as const).map(tab => (
              <button key={tab} onClick={() => { setBulkTab(tab); setBulkRows([]); setBulkCsv(""); }}
                style={{
                  padding:"8px 20px", fontSize:12, fontWeight:600, cursor:"pointer",
                  background:"transparent", border:"none",
                  borderBottom: bulkTab === tab ? "2px solid #D4AF37" : "2px solid transparent",
                  color: bulkTab === tab ? "#D4AF37" : "var(--text-muted)",
                  transition:"all .15s",
                }}>
                {tab === "images" ? "🖼  Upload Images" : "📄  CSV / Spreadsheet"}
              </button>
            ))}
          </div>

          {/* ── Images tab ── */}
          {bulkTab === "images" && (
            <div>
              <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:12, lineHeight:1.7 }}>
                Select or drag <strong style={{color:"#fff"}}>multiple image files</strong> at once.
                Each file becomes a shape. The shape name is taken from the filename automatically.<br/>
                You can edit names, size, and type in the preview below before importing.
              </p>
              <div
                onClick={() => bulkImgRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleBulkImages(e.dataTransfer.files); }}
                style={{
                  border:"2px dashed #2a3550", borderRadius:12, padding:"32px 20px",
                  textAlign:"center", cursor:"pointer", background:"#060d18",
                  transition:"border-color .2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#D4AF37")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#2a3550")}
              >
                <div style={{ fontSize:36, marginBottom:8 }}>🗂️</div>
                <div style={{ fontSize:13, color:"#fff", fontWeight:600 }}>Click to select images, or drag &amp; drop here</div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:6 }}>PNG, JPG, SVG, WEBP — select multiple files at once</div>
              </div>
              <input ref={bulkImgRef} type="file" accept="image/*" multiple style={{ display:"none" }}
                onChange={e => handleBulkImages(e.target.files)} />
            </div>
          )}

          {/* ── CSV tab ── */}
          {bulkTab === "csv" && (
            <div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:10, lineHeight:1.7 }}>
                Paste your shape list below, or upload a <code style={{color:"#D4AF37"}}>.csv</code> file.<br/>
                <strong style={{color:"#fff"}}>Column order:</strong>{" "}
                <code style={{color:"#9ca3af",fontSize:11}}>name, kind, width_in, height_in, stroke_color</code>{" "}
                — all columns after <em>name</em> are optional.{" "}
                <strong style={{color:"#fff"}}>Kind</strong> options: countertop · island · backsplash · cutout
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <button onClick={() => bulkCsvRef.current?.click()}
                  style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer",
                    background:"#1a2438", color:"#fff", border:"1px solid #2a3550" }}>
                  📂 Upload CSV file
                </button>
                <button onClick={() => setBulkCsv("name,kind,width_in,height_in\nKitchen Counter,countertop,96,26\nIsland A,island,60,36\nBathroom Vanity,countertop,48,22")}
                  style={{ padding:"6px 14px", borderRadius:7, fontSize:12, cursor:"pointer",
                    background:"transparent", color:"var(--text-muted)", border:"1px solid #2a2a2a" }}>
                  Load example
                </button>
              </div>
              <input ref={bulkCsvRef} type="file" accept=".csv,text/csv,text/plain" style={{ display:"none" }}
                onChange={e => { const f=e.target.files?.[0]; if(f) handleCsvFile(f); }} />
              <textarea
                className="input"
                rows={7}
                placeholder={"name,kind,width_in,height_in\nKitchen Counter,countertop,96,26\nIsland A,island,60,36"}
                value={bulkCsv}
                onChange={e => setBulkCsv(e.target.value)}
                style={{ fontFamily:"monospace", fontSize:12, width:"100%", marginBottom:10 }}
              />
              <button onClick={handleParseCsv}
                style={{ padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
                  background:"#1a2438", color:"#fff", border:"1px solid #2a3550" }}>
                Preview rows →
              </button>
            </div>
          )}

          {/* ── Preview table ── */}
          {bulkRows.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0 }}>
                  Preview — {bulkRows.length} shape{bulkRows.length !== 1 ? "s" : ""}
                </h3>
                <button onClick={() => setBulkRows([])}
                  style={{ fontSize:11, color:"#f87171", background:"transparent", border:"none", cursor:"pointer" }}>
                  Clear all
                </button>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #1a2438" }}>
                      {bulkTab === "images" && <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Image</th>}
                      <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Name</th>
                      <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Type</th>
                      <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Width"</th>
                      <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Height"</th>
                      <th style={{ padding:"6px 8px", textAlign:"left", color:"var(--text-muted)", fontWeight:600 }}>Color</th>
                      <th style={{ padding:"6px 8px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #0f1929" }}>
                        {bulkTab === "images" && (
                          <td style={{ padding:"5px 8px" }}>
                            {row.image_data
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={row.image_data} alt="" style={{ width:40, height:30, objectFit:"contain", borderRadius:4, border:"1px solid #1a2438" }} />
                              : <div style={{ width:40, height:30, background:"#1a2438", borderRadius:4 }} />
                            }
                          </td>
                        )}
                        <td style={{ padding:"5px 8px" }}>
                          <input className="input" style={{ padding:"3px 8px", fontSize:12 }}
                            value={row.name}
                            onChange={e => setBulkRows(prev => prev.map((r,j) => j===i ? {...r,name:e.target.value} : r))} />
                        </td>
                        <td style={{ padding:"5px 8px" }}>
                          <select className="input" style={{ padding:"3px 8px", fontSize:12 }}
                            value={row.kind}
                            onChange={e => setBulkRows(prev => prev.map((r,j) => j===i ? {...r,kind:e.target.value} : r))}>
                            {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:"5px 8px" }}>
                          <input className="input" type="number" style={{ padding:"3px 8px", fontSize:12, width:70 }}
                            value={row.width_in}
                            onChange={e => setBulkRows(prev => prev.map((r,j) => j===i ? {...r,width_in:parseFloat(e.target.value)||DEFAULT_BULK_W} : r))} />
                        </td>
                        <td style={{ padding:"5px 8px" }}>
                          <input className="input" type="number" style={{ padding:"3px 8px", fontSize:12, width:70 }}
                            value={row.height_in}
                            onChange={e => setBulkRows(prev => prev.map((r,j) => j===i ? {...r,height_in:parseFloat(e.target.value)||DEFAULT_BULK_H} : r))} />
                        </td>
                        <td style={{ padding:"5px 8px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:14, height:14, borderRadius:"50%", background:row.stroke_color, flexShrink:0, border:"1px solid #2a2a2a" }} />
                            <input type="color" value={row.stroke_color}
                              onChange={e => setBulkRows(prev => prev.map((r,j) => j===i ? {...r,stroke_color:e.target.value} : r))}
                              style={{ width:28, height:24, border:"none", background:"transparent", cursor:"pointer", padding:0 }} />
                          </div>
                        </td>
                        <td style={{ padding:"5px 8px" }}>
                          <button onClick={() => setBulkRows(prev => prev.filter((_,j) => j!==i))}
                            style={{ color:"#f87171", background:"transparent", border:"none", cursor:"pointer", fontSize:14 }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:16, display:"flex", gap:10, alignItems:"center" }}>
                <button
                  className="btn-primary"
                  onClick={handleBulkImport}
                  disabled={bulkImporting || !bulkRows.length}
                  style={{ minWidth:180 }}
                >
                  {bulkImporting ? "Importing…" : `⬆ Import ${bulkRows.length} Shape${bulkRows.length !== 1 ? "s" : ""}`}
                </button>
                <span style={{ fontSize:11, color:"var(--text-muted)" }}>
                  You can edit names, sizes, and types in the table above before importing.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
                Default Width (inches)
              </label>
              <input className="input" type="number" step="0.125" min="0.125" placeholder="e.g. 30"
                value={form.default_width_in}
                onChange={e => setForm(f => ({ ...f, default_width_in: e.target.value }))} />
            </div>

            {/* Height */}
            <div>
              <label className="text-xs font-semibold" style={{ color:"var(--text-muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                Default Height (inches)
              </label>
              <input className="input" type="number" step="0.125" min="0.125" placeholder="e.g. 12"
                value={form.default_height_in}
                onChange={e => setForm(f => ({ ...f, default_height_in: e.target.value }))} />
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
              <span style={{ fontSize:12, color:"#9ca3af" }}>{form.name || "Shape name"} · {form.default_width_in}" × {form.default_height_in}"</span>
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
        <div>
          {(()=>{
            const kindOrder = ["countertop","island","backsplash","cutout"];
            const kindLabel: Record<string,string> = { countertop:"Countertops", island:"Islands", backsplash:"Backsplash", cutout:"Cutouts" };
            const grouped: Record<string,ShapeTemplate[]> = {};
            templates.forEach(t => { if(!grouped[t.kind]) grouped[t.kind]=[]; grouped[t.kind].push(t); });
            const orderedKinds = [...kindOrder.filter(k=>grouped[k]), ...Object.keys(grouped).filter(k=>!kindOrder.includes(k))];
            return orderedKinds.map(kind => (
              <div key={kind} style={{ marginBottom:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:4, height:18, borderRadius:2, background: kindColor[kind]??kindColor.countertop }}/>
                  <h3 style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0 }}>{kindLabel[kind]??kind}</h3>
                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>({grouped[kind].length})</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
          {grouped[kind].map(t => (
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
                  {(Number(t.default_width_ft)*12).toFixed(1)}" × {(Number(t.default_height_ft)*12).toFixed(1)}"
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
              </div>
            ));
          })()}
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
