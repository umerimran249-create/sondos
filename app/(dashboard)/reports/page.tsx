"use client";

import useSWR from "swr";
import { useState } from "react";

type Report = { id: string; code: string; name: string; category: string };
type ReportData = { columns: string[]; rows: string[][]; error?: string };

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CATEGORIES: Record<string, { icon: string; color: string; label: string }> = {
  customers:  { icon: "👥", color: "#D4AF37", label: "Customers"  },
  inventory:  { icon: "📦", color: "#60a5fa", label: "Inventory"  },
  accounting: { icon: "🧾", color: "#4ade80", label: "Accounting" },
  financial:  { icon: "📈", color: "#c084fc", label: "Financial"  },
  sales:      { icon: "💰", color: "#fb923c", label: "Sales"      },
};

export default function ReportsPage() {
  const { data } = useSWR<{ reports: Report[] }>("/api/reports", fetcher);
  const reports = data?.reports ?? [];

  const [activeCategory, setActiveCategory] = useState("customers");
  const [open, setOpen]           = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading]     = useState(false);

  const categoryReports = reports.filter(r => r.category === activeCategory);
  const cat = CATEGORIES[activeCategory];

  async function openReport(r: Report) {
    if (open?.code === r.code) { setOpen(null); setReportData(null); return; }
    setOpen(r); setReportData(null); setLoading(true);
    const res  = await fetch(`/api/reports/run?code=${r.code}`);
    const json = await res.json();
    setReportData(json); setLoading(false);
  }

  function exportCSV() {
    if (!reportData || !open) return;
    const lines = [
      reportData.columns.join(","),
      ...reportData.rows.map(r => r.map(c => `"${c ?? ""}"`).join(",")),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${open.code}.csv`; a.click();
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Select a category, then click a report to view live data</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORIES).map(([key, c]) => {
          const count = reports.filter(r => r.category === key).length;
          const active = activeCategory === key;
          return (
            <button key={key} onClick={() => { setActiveCategory(key); setOpen(null); setReportData(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 16px", borderRadius: 10,
                border: active ? `1px solid ${c.color}` : "1px solid var(--border)",
                background: active ? `${c.color}14` : "var(--surface)",
                color: active ? c.color : "var(--text-muted)",
                fontWeight: active ? 600 : 400, fontSize: 13, cursor: "pointer",
                transition: "all 0.15s",
              }}>
              <span style={{fontSize:16}}>{c.icon}</span>
              {c.label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: active ? `${c.color}25` : "var(--surface2)",
                color: active ? c.color : "var(--text-muted)",
                borderRadius: 99, padding: "1px 7px",
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: open ? "300px 1fr" : "1fr", gap: 16, alignItems: "start" }}>

        {/* Report list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{cat?.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{cat?.label} Reports</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{categoryReports.length} reports</span>
          </div>

          <div style={{ padding: "8px" }}>
            {categoryReports.map(r => {
              const isActive = open?.code === r.code;
              return (
                <button key={r.id} onClick={() => openReport(r)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                    border: isActive ? `1px solid ${cat.color}` : "1px solid transparent",
                    background: isActive ? `${cat.color}10` : "transparent",
                    cursor: "pointer", transition: "all 0.12s", textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? cat.color : "var(--text)" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, textTransform: "capitalize" }}>
                      {r.category}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: isActive ? cat.color : "var(--text-muted)" }}>
                    {isActive ? "▶" : "→"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report viewer */}
        {open && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Report header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: `${cat.color}08`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${cat.color}20`, fontSize: 16,
                }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{open.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {reportData && !loading ? `${reportData.rows.length} records` : "Loading…"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {reportData && !reportData.error && !loading && (
                  <button className="btn-secondary" onClick={exportCSV} style={{ fontSize: 11, padding: "5px 12px" }}>
                    ↓ Export CSV
                  </button>
                )}
                <button onClick={() => { setOpen(null); setReportData(null); }}
                  style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Loading spinner */}
            {loading && (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{
                  width: 32, height: 32, border: `2px solid ${cat.color}`, borderTopColor: "transparent",
                  borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
                }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Fetching data…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {/* Error */}
            {reportData?.error && !loading && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#f87171" }}>⚠ {reportData.error}</p>
              </div>
            )}

            {/* Table */}
            {reportData && !reportData.error && !loading && (
              <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {reportData.columns.map((col, i) => (
                        <th key={i} style={{
                          padding: "10px 16px", textAlign: "left",
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: cat.color,
                          background: "var(--surface)", position: "sticky", top: 0,
                          whiteSpace: "nowrap",
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.length ? reportData.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {row.map((cell, ci) => {
                          const isDollar = typeof cell === "string" && cell.startsWith("$");
                          const isWarn   = cell === "⚠ Reorder Now" || cell === "Yes";
                          const isOk     = cell === "OK" || cell === "No";
                          const isBold   = typeof row[0] === "string" && (row[0].includes("Total") || row[0].includes("NET") || row[0].includes("ASSETS") || row[0].includes("LIABILITIES") || row[0].includes("REVENUE"));
                          return (
                            <td key={ci} style={{
                              padding: "9px 16px",
                              color: isDollar ? cat.color : isWarn ? "#f87171" : isOk ? "#4ade80" : "var(--text)",
                              fontWeight: isBold || isDollar ? 600 : 400,
                            }}>
                              {cell ?? "—"}
                            </td>
                          );
                        })}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={reportData.columns.length} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                          No data yet — add records to populate this report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Placeholder when nothing selected */}
        {!open && (
          <div style={{ display: "none" }} />
        )}
      </div>

      {/* Empty placeholder when no report selected and grid is 1-col */}
      {!open && (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 6 }}>Select a report</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Choose a category above, then click any report in the list to view live data.
          </p>
        </div>
      )}
    </div>
  );
}
