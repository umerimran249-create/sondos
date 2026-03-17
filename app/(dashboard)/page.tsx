"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardPage() {
  const { data: quotes }  = useSWR("/api/quotes",      fetcher);
  const { data: jobs }    = useSWR("/api/jobs",        fetcher);
  const { data: holds }   = useSWR("/api/holds",       fetcher);
  const { data: inv }     = useSWR("/api/inventory",   fetcher);
  const { data: orders }  = useSWR("/api/sales-orders",fetcher);
  const { data: cust }    = useSWR("/api/customers",   fetcher);

  const openQuotes   = (quotes?.quotes  ?? []).filter((q: any) => q.status === "draft" || q.status === "sent").length;
  const activeJobs   = (jobs?.jobs      ?? []).filter((j: any) => !["completed","cancelled"].includes(j.status)).length;
  const activeHolds  = (holds?.holds    ?? []).filter((h: any) => h.is_active).length;
  const totalInv     = (inv?.inventory  ?? []).reduce((s: number, i: any) => s + (i.sqft ?? 0), 0);
  const pendingOrders= (orders?.orders  ?? []).filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length;
  const totalCust    = (cust?.customers ?? []).length;

  const recentJobs   = (jobs?.jobs   ?? []).slice(0, 5);
  const recentQuotes = (quotes?.quotes ?? []).slice(0, 5);

  const stats = [
    { label:"Open Quotes",     value: openQuotes,            href:"/quotes",      color:"#D4AF37", icon:"📋" },
    { label:"Active Jobs",     value: activeJobs,            href:"/jobs",        color:"#60a5fa", icon:"🔨" },
    { label:"Active Holds",    value: activeHolds,           href:"/holds",       color:"#c084fc", icon:"🔒" },
    { label:"Inventory (sqft)",value: totalInv.toFixed(0),   href:"/inventory",   color:"#4ade80", icon:"📦" },
    { label:"Open Orders",     value: pendingOrders,         href:"/sales-orders",color:"#fb923c", icon:"🛒" },
    { label:"Customers",       value: totalCust,             href:"/customers",   color:"#D4AF37", icon:"👥" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration:"none" }}>
            <div className="stat-card group cursor-pointer" style={{ transition:"border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = s.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color, fontSize:28 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Jobs</h2>
            <Link href="/jobs" className="text-xs" style={{color:"var(--gold)"}}>View all →</Link>
          </div>
          <div className="space-y-2">
            {recentJobs.map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-2 rounded-lg" style={{background:"var(--surface2)"}}>
                <div>
                  <div className="text-sm font-medium text-white">{j.job_number}</div>
                  <div className="text-xs" style={{color:"var(--text-muted)"}}>{j.customers?.name ?? "—"}</div>
                </div>
                <span className="badge badge-blue capitalize">{j.status}</span>
              </div>
            ))}
            {!recentJobs.length && <p className="text-xs text-center py-4" style={{color:"var(--text-muted)"}}>No jobs yet.</p>}
          </div>
        </div>

        {/* Recent quotes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Quotes</h2>
            <Link href="/quotes" className="text-xs" style={{color:"var(--gold)"}}>View all →</Link>
          </div>
          <div className="space-y-2">
            {recentQuotes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between p-2 rounded-lg" style={{background:"var(--surface2)"}}>
                <div>
                  <div className="text-sm font-medium text-white">{q.quote_id}</div>
                  <div className="text-xs" style={{color:"var(--text-muted)"}}>{q.customers?.name ?? "—"}</div>
                </div>
                <span className="font-semibold text-sm" style={{color:"var(--gold)"}}>
                  ${(q.total_amount ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
            {!recentQuotes.length && <p className="text-xs text-center py-4" style={{color:"var(--text-muted)"}}>No quotes yet.</p>}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            ["/customers","+ New Customer"],
            ["/quotes","+ New Quote"],
            ["/jobs","+ New Job"],
            ["/inventory","+ Add Slab"],
            ["/holds","+ New Hold"],
            ["/drawing","Open Drawing Tool"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="btn-secondary" style={{textDecoration:"none",fontSize:12}}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
