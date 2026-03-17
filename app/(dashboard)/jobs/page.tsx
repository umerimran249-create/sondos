"use client";

import useSWR from "swr";
import { useState } from "react";
import { EditModal } from "@/components/EditModal";

type Job = { id:string; job_number:string; status:string; deposit_amount:number; waste_factor:number; created_at:string; customers:{name:string}|null; quotes:{quote_id:string}|null };

const fetcher = (url:string) => fetch(url).then(r=>r.json());
const STAGES = ["templating","cutting","cnc","polishing","installation"];
const STATUS_COLOR: Record<string,string> = { pending:"badge-gray", in_progress:"badge-blue", templating:"badge-blue", cutting:"badge-gold", cnc:"badge-purple", polishing:"badge-blue", installation:"badge-green", completed:"badge-green", on_hold:"badge-gold", cancelled:"badge-red" };

export default function JobsPage() {
  const { data, mutate } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher);
  const { data: custData } = useSWR<{ customers:{id:string,name:string}[] }>("/api/customers", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ job_number:"", customer_id:"", deposit_amount:0, waste_factor:10 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Job|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  const jobs = (data?.jobs ?? []).filter(j => filter==="all" || j.status===filter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/jobs", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false); mutate();
  }

  async function handleEdit(updated: Record<string,any>) {
    const res = await fetch(`/api/jobs/${editing!.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job?")) return;
    setDeleting(id);
    await fetch(`/api/jobs/${id}`, { method:"DELETE" });
    setDeleting(null); mutate();
  }

  async function updateStatus(id:string, status:string) {
    await fetch(`/api/jobs/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    mutate();
  }

  return (
    <div className="space-y-6">
      {editing && (
        <EditModal title={`Edit — ${editing.job_number}`}
          fields={[
            { key:"job_number",      label:"Job Number" },
            { key:"status",          label:"Status", options:["pending","templating","cutting","cnc","polishing","installation","completed","on_hold","cancelled"] },
            { key:"deposit_amount",  label:"Deposit ($)",     type:"number" },
            { key:"waste_factor",    label:"Waste Factor (%)",type:"number" },
            { key:"remnant_notes",   label:"Remnant Notes",   type:"textarea" },
          ]}
          values={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title">Jobs</h1><p className="page-subtitle">Fabrication pipeline and scheduling</p></div>
        <button className="btn-primary" onClick={() => setShowForm(s=>!s)}>+ New Job</button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {STAGES.map(stage => (
          <div key={stage} className="card text-center cursor-pointer" onClick={()=>setFilter(f=>f===stage?"all":stage)}
            style={{border:filter===stage?"1px solid var(--gold)":undefined}}>
            <div className="text-xs font-semibold capitalize mb-1" style={{color:"var(--text-muted)"}}>{stage}</div>
            <div className="text-2xl font-bold" style={{color:filter===stage?"var(--gold)":"white"}}>{(data?.jobs??[]).filter(j=>j.status===stage).length}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New job</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Job Number</label><input className="input" required value={form.job_number} onChange={e=>setForm(f=>({...f,job_number:e.target.value}))} /></div>
            <div className="col-span-2"><label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))}>
                <option value="">— select —</option>
                {custData?.customers?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="label">Deposit ($)</label><input type="number" className="input" value={form.deposit_amount} onChange={e=>setForm(f=>({...f,deposit_amount:Number(e.target.value)}))} /></div>
            <div><label className="label">Waste (%)</label><input type="number" className="input" value={form.waste_factor} onChange={e=>setForm(f=>({...f,waste_factor:Number(e.target.value)}))} /></div>
            {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
            <div className="col-span-2 flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving?"Saving…":"Create"}</button>
              <button type="button" className="btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <select className="input max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {["pending","templating","cutting","cnc","polishing","installation","completed","on_hold","cancelled"].map(s=><option key={s}>{s}</option>)}
          </select>
          <span className="text-xs" style={{color:"var(--text-muted)"}}>{jobs.length} jobs</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Job #</th><th>Customer</th><th>Status</th><th>Deposit</th><th>Waste</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td style={{color:"var(--gold)"}} className="font-semibold">{j.job_number}</td>
                  <td className="text-white">{j.customers?.name ?? "—"}</td>
                  <td>
                    <select style={{padding:"2px 6px",fontSize:11,width:130,background:"var(--bg)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:4}}
                      value={j.status} onChange={e=>updateStatus(j.id,e.target.value)}>
                      {["pending","templating","cutting","cnc","polishing","installation","completed","on_hold","cancelled"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>${(j.deposit_amount??0).toFixed(2)}</td>
                  <td>{j.waste_factor??10}%</td>
                  <td className="text-xs">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-secondary" style={{padding:"2px 10px",fontSize:11}} onClick={()=>setEditing(j)}>Edit</button>
                      <button className="btn-danger" style={{padding:"2px 10px",fontSize:11}} disabled={deleting===j.id} onClick={()=>handleDelete(j.id)}>{deleting===j.id?"…":"Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!jobs.length && <tr><td colSpan={7} className="py-10 text-center" style={{color:"var(--text-muted)"}}>No jobs.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
