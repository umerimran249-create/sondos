"use client";

import useSWR from "swr";
import { useState } from "react";

type DropdownValue = { id: string; category: string; code: string; label: string; sort_order: number; active: boolean };

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TABS = ["Company","Labor Rates","Dropdowns","Users & Roles","Warehouse"] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Company");
  const { data: ddData, mutate: mutateDd } = useSWR<{ values: DropdownValue[] }>("/api/settings/dropdowns", fetcher);
  const [company, setCompany] = useState({ company_name:"Stone Fabrication Co.", currency:"USD", tax_rate:"8.5" });
  const [rates, setRates] = useState({ material_per_sqft:"65", shape_labor_per_sqft:"22", edge_labor_per_lf:"9", corner_cost_each:"45", sink_cutout_cost:"160", backsplash_per_lf:"12" });
  const [saved, setSaved] = useState(false);
  const [ddForm, setDdForm] = useState({ category:"customer_type", code:"", label:"" });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addDropdown(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/dropdowns", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(ddForm) });
    setDdForm(d => ({...d, code:"", label:""}));
    mutateDd();
  }

  const ddCategories = [...new Set((ddData?.values ?? []).map(d => d.category))];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your Stone ERP system</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{background:"var(--surface)",width:"fit-content"}}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight: tab===t?600:400,
              background: tab===t ? "linear-gradient(135deg,#D4AF37,#A88B20)" : "transparent",
              color: tab===t ? "#0b0d11" : "var(--text-muted)",
              border:"none", cursor:"pointer",
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Company */}
      {tab === "Company" && (
        <div className="card max-w-lg space-y-4">
          <h2 className="text-sm font-semibold text-white">Company settings</h2>
          {[["Company name","company_name","text"],["Currency","currency","text"],["Tax rate (%)","tax_rate","number"]].map(([lbl,k,type]) => (
            <div key={k}>
              <label className="label">{lbl as string}</label>
              <input type={type as string} className="input" value={(company as any)[k as string]}
                onChange={e => setCompany(c => ({...c, [k as string]:e.target.value}))} />
            </div>
          ))}
          <button className="btn-primary" onClick={handleSave}>{saved ? "✓ Saved!" : "Save Changes"}</button>
        </div>
      )}

      {/* Labor Rates */}
      {tab === "Labor Rates" && (
        <div className="card max-w-lg space-y-4">
          <h2 className="text-sm font-semibold text-white">Labor & material rates</h2>
          <div className="grid grid-cols-2 gap-3">
            {[["Material $/sqft","material_per_sqft"],["Shape labor $/sqft","shape_labor_per_sqft"],
              ["Edge labor $/lf","edge_labor_per_lf"],["Corner $/each","corner_cost_each"],
              ["Sink cutout $/each","sink_cutout_cost"],["Backsplash $/lf","backsplash_per_lf"]
            ].map(([lbl,k]) => (
              <div key={k}>
                <label className="label">{lbl}</label>
                <input type="number" className="input" value={(rates as any)[k]}
                  onChange={e => setRates(r => ({...r, [k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleSave}>{saved ? "✓ Saved!" : "Save Rates"}</button>
        </div>
      )}

      {/* Dropdowns */}
      {tab === "Dropdowns" && (
        <div className="space-y-4">
          <div className="card max-w-lg">
            <h2 className="text-sm font-semibold text-white mb-3">Add dropdown value</h2>
            <form onSubmit={addDropdown} className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={ddForm.category} onChange={e => setDdForm(d=>({...d,category:e.target.value}))}>
                  {["customer_type","material_type","finish_type","country","product_group"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div><label className="label">Code</label>
                <input className="input" required value={ddForm.code} onChange={e => setDdForm(d=>({...d,code:e.target.value}))} /></div>
              <div><label className="label">Label</label>
                <input className="input" required value={ddForm.label} onChange={e => setDdForm(d=>({...d,label:e.target.value}))} /></div>
              <div className="col-span-3"><button className="btn-primary">Add Value</button></div>
            </form>
          </div>
          {ddCategories.map(cat => (
            <div key={cat} className="card">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"var(--gold)"}}>{cat}</h3>
              <div className="flex flex-wrap gap-2">
                {(ddData?.values ?? []).filter(d => d.category === cat).map(d => (
                  <span key={d.id} className="badge badge-gray">{d.label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users & Roles */}
      {tab === "Users & Roles" && (
        <div className="card max-w-2xl">
          <h2 className="text-sm font-semibold text-white mb-4">User roles</h2>
          <div className="grid grid-cols-1 gap-2">
            {[["Admin","Full system access — all modules, all permissions","badge-gold"],
              ["Sales","Quotes, customers, holds, sales orders","badge-blue"],
              ["Fabricator","Jobs, schedule, drawing tool","badge-green"],
              ["Warehouse","Inventory, receiving, deliveries","badge-purple"],
              ["Accounting","Invoices, reports, financial modules","badge-gray"],
            ].map(([role, desc, badge]) => (
              <div key={role} className="flex items-center gap-4 p-3 rounded-lg" style={{background:"var(--surface2)"}}>
                <span className={`badge ${badge}`}>{role}</span>
                <span className="text-sm" style={{color:"var(--text-muted)"}}>{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{color:"var(--text-muted)"}}>
            To create users: go to your Supabase dashboard → Authentication → Users → Invite user.
          </p>
        </div>
      )}

      {/* Warehouse */}
      {tab === "Warehouse" && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold text-white mb-4">Warehouse locations</h2>
          <p className="text-sm mb-4" style={{color:"var(--text-muted)"}}>Configure bins, A-frames and slab racks.</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["Bins","bin","badge-blue"],["A-Frames","a_frame","badge-gold"],["Racks","rack","badge-green"]].map(([label, type, badge]) => (
              <div key={type} className="p-4 rounded-lg" style={{background:"var(--surface2)"}}>
                <span className={`badge ${badge} mb-2 block`}>{label}</span>
                <div className="text-2xl font-bold text-white">0</div>
                <div className="text-xs mt-1" style={{color:"var(--text-muted)"}}>configured</div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{color:"var(--text-muted)"}}>
            Warehouse locations are managed via the Inventory → Locations module.
          </p>
        </div>
      )}
    </div>
  );
}
