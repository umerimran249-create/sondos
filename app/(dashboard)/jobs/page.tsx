"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import { EditModal } from "@/components/EditModal";

type Job = {
  id: string;
  job_number: string;
  status: string;
  deposit_amount: number;
  waste_factor: number;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  customers: { name: string; email?: string; phone?: string } | null;
  quotes: { quote_id: string } | null;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STAGES = ["templating", "cutting", "cnc", "polishing", "installation"];

const STATUS_COLOR: Record<string, string> = {
  pending: "#6b7280",
  templating: "#60a5fa",
  cutting: "#D4AF37",
  cnc: "#a78bfa",
  polishing: "#60a5fa",
  installation: "#4ade80",
  completed: "#22c55e",
  on_hold: "#f59e0b",
  cancelled: "#ef4444",
};

const STATUS_BG: Record<string, string> = {
  pending: "rgba(107,114,128,0.15)",
  templating: "rgba(96,165,250,0.15)",
  cutting: "rgba(212,175,55,0.15)",
  cnc: "rgba(167,139,250,0.15)",
  polishing: "rgba(96,165,250,0.15)",
  installation: "rgba(74,222,128,0.15)",
  completed: "rgba(34,197,94,0.15)",
  on_hold: "rgba(245,158,11,0.15)",
  cancelled: "rgba(239,68,68,0.15)",
};

const ALL_STATUSES = ["pending","templating","cutting","cnc","polishing","installation","completed","on_hold","cancelled"];

// ─── JOB DETAIL MODAL ────────────────────────────────────────────────────────
function JobDetailModal({ job, onClose, onStatusChange }: {
  job: Job;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState(job.status);

  function handleStatusSave() {
    onStatusChange(job.id, localStatus);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#13151a", border: "1px solid #2a2a2a", borderRadius: 18,
          padding: "28px 32px", minWidth: 380, maxWidth: 520, width: "90%",
          boxShadow: "0 0 60px rgba(0,0,0,0.8)",
          animation: "fadeInScale .18s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ color: "var(--gold)", fontWeight: 800, fontSize: 20 }}>{job.job_number}</div>
            {job.customers && (
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 3 }}>{job.customers.name}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: STATUS_BG[job.status] ?? "rgba(107,114,128,0.15)",
            color: STATUS_COLOR[job.status] ?? "#6b7280",
            border: `1px solid ${STATUS_COLOR[job.status] ?? "#6b7280"}40`,
            textTransform: "capitalize",
          }}>
            {job.status.replace("_", " ")}
          </span>
        </div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Scheduled", job.scheduled_date ? new Date(job.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : "Not scheduled"],
            ["Deposit", `$${(job.deposit_amount ?? 0).toFixed(2)}`],
            ["Waste Factor", `${job.waste_factor ?? 10}%`],
            ["Created", new Date(job.created_at).toLocaleDateString()],
            ...(job.quotes?.quote_id ? [["Quote", job.quotes.quote_id]] : []),
            ...(job.customers?.email ? [["Email", job.customers.email]] : []),
            ...(job.customers?.phone ? [["Phone", job.customers.phone]] : []),
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#1c1f26", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ color: "#6b7280", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {job.notes && (
          <div style={{ background: "#1c1f26", borderLeft: "3px solid var(--gold)", borderRadius: "0 8px 8px 0", padding: "12px 14px", marginBottom: 20 }}>
            <div style={{ color: "#6b7280", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Notes</div>
            <div style={{ color: "#e5e7eb", fontSize: 13, lineHeight: 1.6 }}>{job.notes}</div>
          </div>
        )}

        {/* Quick status change */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={localStatus}
            onChange={e => setLocalStatus(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", background: "#1c1f26", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 13 }}
          >
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <button
            onClick={handleStatusSave}
            style={{
              padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: "linear-gradient(135deg,#D4AF37,#A88B20)", border: "none",
              color: "#0b0d11", cursor: "pointer",
            }}
          >
            Update
          </button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, background: "#1c1f26", border: "1px solid #2a2a2a", color: "#9ca3af", cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function JobCalendar({ jobs, onJobClick }: { jobs: Job[]; onJobClick: (job: Job) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based

  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  // Build map: "YYYY-MM-DD" -> Job[]
  const jobMap = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const j of jobs) {
      if (j.scheduled_date) {
        const key = j.scheduled_date.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(j);
      }
    }
    return map;
  }, [jobs]);

  // Days in month
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date | null; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  const unscheduled = jobs.filter(j => !j.scheduled_date);

  return (
    <div className="space-y-4">
      {/* Calendar nav */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, background: "#1c1f26", border: "1px solid #2a2a2a", color: "#fff", cursor: "pointer", fontSize: 16 }}>‹</button>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, background: "#1c1f26", border: "1px solid #2a2a2a", color: "#fff", cursor: "pointer", fontSize: 16 }}>›</button>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>{monthName}</h2>
          </div>
          <button onClick={goToday} style={{ padding: "5px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid #2a2a2a", color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Today</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ textAlign: "center", color: "#4b5563", fontSize: 11, fontWeight: 700, padding: "4px 0", textTransform: "uppercase", letterSpacing: ".5px" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {cells.map((cell, i) => {
            if (!cell.date) return <div key={i} />;
            const key = cell.date.toISOString().slice(0, 10);
            const dayJobs = jobMap[key] ?? [];
            const isToday = cell.isCurrentMonth
              && cell.date.getDate() === today.getDate()
              && cell.date.getMonth() === today.getMonth()
              && cell.date.getFullYear() === today.getFullYear();

            return (
              <div
                key={i}
                style={{
                  minHeight: 80,
                  background: isToday ? "rgba(212,175,55,0.08)" : "#1c1f26",
                  borderRadius: 8,
                  padding: "6px 6px 4px",
                  border: isToday ? "1px solid rgba(212,175,55,0.5)" : "1px solid #242830",
                  opacity: cell.isCurrentMonth ? 1 : 0.35,
                  overflow: "hidden",
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isToday ? "var(--gold)" : cell.isCurrentMonth ? "#9ca3af" : "#4b5563",
                  marginBottom: 4, textAlign: "right",
                }}>
                  {cell.date.getDate()}
                </div>

                {/* Job badges */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayJobs.slice(0, 3).map(job => (
                    <button
                      key={job.id}
                      onClick={() => onJobClick(job)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "3px 6px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                        background: STATUS_BG[job.status] ?? "rgba(107,114,128,0.15)",
                        color: STATUS_COLOR[job.status] ?? "#6b7280",
                        border: `1px solid ${STATUS_COLOR[job.status] ?? "#6b7280"}40`,
                        cursor: "pointer", overflow: "hidden",
                        whiteSpace: "nowrap", textOverflow: "ellipsis",
                        transition: "transform .1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      title={`${job.job_number} — ${job.customers?.name ?? ""} (${job.status})`}
                    >
                      {job.job_number}
                    </button>
                  ))}
                  {dayJobs.length > 3 && (
                    <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center", paddingTop: 1 }}>
                      +{dayJobs.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginRight: 4 }}>Status:</span>
          {ALL_STATUSES.map(s => (
            <span key={s} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: STATUS_BG[s], color: STATUS_COLOR[s],
              border: `1px solid ${STATUS_COLOR[s]}40`,
              textTransform: "capitalize",
            }}>
              {s.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      {/* Unscheduled jobs */}
      {unscheduled.length > 0 && (
        <div className="card">
          <h3 style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span> Unscheduled Jobs ({unscheduled.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unscheduled.map(job => (
              <button
                key={job.id}
                onClick={() => onJobClick(job)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: STATUS_BG[job.status] ?? "rgba(107,114,128,0.15)",
                  color: STATUS_COLOR[job.status] ?? "#6b7280",
                  border: `1px solid ${STATUS_COLOR[job.status] ?? "#6b7280"}40`,
                  cursor: "pointer",
                }}
              >
                {job.job_number}
                {job.customers && <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.75 }}>· {job.customers.name}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const { data, mutate } = useSWR<{ jobs: Job[] }>("/api/jobs", fetcher);
  const { data: custData } = useSWR<{ customers: { id: string; name: string }[] }>("/api/customers", fetcher);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ job_number: "", customer_id: "", deposit_amount: 0, waste_factor: 10, scheduled_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const allJobs = data?.jobs ?? [];
  const jobs = allJobs.filter(j => filter === "all" || j.status === filter);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setShowForm(false);
    setForm({ job_number: "", customer_id: "", deposit_amount: 0, waste_factor: 10, scheduled_date: "", notes: "" });
    mutate();
  }

  async function handleEdit(updated: Record<string, any>) {
    const res = await fetch(`/api/jobs/${editing!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job?")) return;
    setDeleting(id);
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setDeleting(null); mutate();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    mutate();
  }

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editing && (
        <EditModal
          title={`Edit — ${editing.job_number}`}
          fields={[
            { key: "job_number",     label: "Job Number" },
            { key: "status",         label: "Status", options: ALL_STATUSES },
            { key: "scheduled_date", label: "Scheduled Date", type: "date" },
            { key: "deposit_amount", label: "Deposit ($)", type: "number" },
            { key: "waste_factor",   label: "Waste Factor (%)", type: "number" },
            { key: "notes",          label: "Notes", type: "textarea" },
            { key: "remnant_notes",  label: "Remnant Notes", type: "textarea" },
          ]}
          values={editing}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Job detail popup (calendar click) */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={async (id, status) => { await updateStatus(id, status); mutate(); setSelectedJob(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">Fabrication pipeline and scheduling</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--surface)", borderRadius: 9, padding: 3, gap: 2, border: "1px solid #2a2a2a" }}>
            <button onClick={() => setView("list")} style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
              background: view === "list" ? "linear-gradient(135deg,#D4AF37,#A88B20)" : "transparent",
              color: view === "list" ? "#0b0d11" : "var(--text-muted)",
            }}>☰ List</button>
            <button onClick={() => setView("calendar")} style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
              background: view === "calendar" ? "linear-gradient(135deg,#D4AF37,#A88B20)" : "transparent",
              color: view === "calendar" ? "#0b0d11" : "var(--text-muted)",
            }}>📅 Calendar</button>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>+ New Job</button>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="pipeline-grid">
        {STAGES.map(stage => (
          <div key={stage} className="card text-center cursor-pointer"
            onClick={() => setFilter(f => f === stage ? "all" : stage)}
            style={{ border: filter === stage ? "1px solid var(--gold)" : undefined }}>
            <div className="text-xs font-semibold capitalize mb-1" style={{ color: "var(--text-muted)" }}>{stage}</div>
            <div className="text-2xl font-bold" style={{ color: filter === stage ? "var(--gold)" : "white" }}>
              {allJobs.filter(j => j.status === stage).length}
            </div>
          </div>
        ))}
      </div>

      {/* New job form */}
      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-sm font-semibold mb-4 text-white">New job</h2>
          <form onSubmit={handleCreate} className="grid form-grid gap-3">
            <div className="col-span-2">
              <label className="label">Job Number</label>
              <input className="input" required value={form.job_number} onChange={e => setForm(f => ({ ...f, job_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">— select —</option>
                {custData?.customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deposit ($)</label>
              <input type="number" className="input" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Waste (%)</label>
              <input type="number" className="input" value={form.waste_factor} onChange={e => setForm(f => ({ ...f, waste_factor: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Scheduled Date</label>
              <input type="date" className="input" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {error && <p className="col-span-2 text-xs text-red-400">{error}</p>}
            <div className="col-span-2 flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Create"}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === "calendar" && (
        <JobCalendar jobs={allJobs} onJobClick={setSelectedJob} />
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <select className="input max-w-xs" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{jobs.length} jobs</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Deposit</th>
                  <th>Waste</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td
                      style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => setSelectedJob(j)}
                    >
                      {j.job_number}
                    </td>
                    <td className="text-white">{j.customers?.name ?? "—"}</td>
                    <td>
                      <select
                        style={{ padding: "2px 6px", fontSize: 11, width: 130, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4 }}
                        value={j.status}
                        onChange={e => updateStatus(j.id, e.target.value)}
                      >
                        {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-xs" style={{ color: j.scheduled_date ? "var(--gold)" : "var(--text-muted)" }}>
                      {j.scheduled_date ? new Date(j.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td>${(j.deposit_amount ?? 0).toFixed(2)}</td>
                    <td>{j.waste_factor ?? 10}%</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: 11 }} onClick={() => setEditing(j)}>Edit</button>
                        <button className="btn-danger" style={{ padding: "2px 10px", fontSize: 11 }} disabled={deleting === j.id} onClick={() => handleDelete(j.id)}>
                          {deleting === j.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!jobs.length && (
                  <tr><td colSpan={7} className="py-10 text-center" style={{ color: "var(--text-muted)" }}>No jobs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
