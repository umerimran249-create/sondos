"use client";

import useSWR from "swr";
import Link from "next/link";

type EmailLog = {
  id: string;
  quote_id: string | null;
  quote_ref: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: "sent" | "failed";
  error_message: string | null;
  sent_at: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EmailLogsPage() {
  const { data, isLoading, mutate } = useSWR<{ logs: EmailLog[] }>("/api/email-logs", fetcher, {
    refreshInterval: 15000,
  });

  const logs = data?.logs ?? [];
  const sentCount = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status === "failed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Logs</h1>
          <p className="page-sub">All quotation emails sent to customers — auto-refreshes every 15 s</p>
        </div>
        <button className="btn-secondary" onClick={() => mutate()}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div className="stats-grid-3">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--gold)" }}>{logs.length}</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Total Emails</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>{sentCount}</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Delivered</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>{failedCount}</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Failed</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Send History</h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {logs.length} record{logs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No emails sent yet.</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Open a quote and click <strong style={{ color: "var(--gold)" }}>Send to Customer</strong> to send the first email.
            </p>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Note: If this is the first email, make sure you have run the database migration to create the email_logs table.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Quote</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>
                      {new Date(log.sent_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {log.quote_id ? (
                        <Link
                          href={`/quotes/${log.quote_id}`}
                          style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none", fontSize: 13 }}
                        >
                          {log.quote_ref ?? log.quote_id}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ color: "#fff", fontSize: 13 }}>{log.recipient_name || "—"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{log.recipient_email}</div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.subject}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: log.status === "sent" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: log.status === "sent" ? "#22c55e" : "#ef4444",
                        border: `1px solid ${log.status === "sent" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      }}>
                        {log.status === "sent" ? "✓ Sent" : "✗ Failed"}
                      </span>
                    </td>
                    <td style={{ color: "#ef4444", fontSize: 11, maxWidth: 180 }}>
                      {log.error_message ? (
                        <span
                          title={log.error_message}
                          style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {log.error_message}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Migration reminder */}
      <div className="card" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.04)" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--gold)" }}>⚠️ First-time setup</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          If Email Logs shows no data after sending, the <code>email_logs</code> table may not exist yet.
          Run the following SQL in your{" "}
          <a
            href="https://supabase.com/dashboard/project/gztldxsankbrglyauhnv/sql/new"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--gold)" }}
          >
            Supabase SQL Editor
          </a>:
        </p>
        <pre style={{
          background: "#0d0f14", border: "1px solid #2a2a2a", borderRadius: 8,
          padding: "14px 16px", fontSize: 11, color: "#86efac",
          overflowX: "auto", lineHeight: 1.8, margin: 0,
        }}>{`-- New columns on existing tables
ALTER TABLE quotes     ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'prepaid';
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_width    NUMERIC;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_height   NUMERIC;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS slab_thickness NUMERIC;
ALTER TABLE jobs        ADD COLUMN IF NOT EXISTS quote_id      UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE deliveries  ADD COLUMN IF NOT EXISTS notes         TEXT;

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  quote_ref        TEXT,
  recipient_email  TEXT NOT NULL,
  recipient_name   TEXT,
  subject          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent',
  error_message    TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';`}</pre>
      </div>
    </div>
  );
}
