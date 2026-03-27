"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/",             label: "Dashboard",    icon: "▦" },
  { href: "/customers",    label: "Customers",    icon: "👥" },
  { href: "/products",     label: "Products",     icon: "🪨" },
  { href: "/inventory",    label: "Inventory",    icon: "📦" },
  { href: "/quotes",       label: "Quotes",       icon: "📋" },
  { href: "/jobs",         label: "Jobs",         icon: "🔨" },
  { href: "/holds",        label: "Holds",        icon: "🔒" },
  { href: "/sales-orders", label: "Sales Orders", icon: "🛒" },
  { href: "/deliveries",   label: "Deliveries",   icon: "🚚" },
  { href: "/purchasing",   label: "Purchasing",   icon: "📥" },
  { href: "/reports",      label: "Reports",      icon: "📊" },
  { href: "/drawing",      label: "Drawing Tool", icon: "✏️" },
  { href: "/settings",     label: "Settings",       icon: "⚙️" },
  { href: "/email-logs",   label: "Email Logs",     icon: "📨" },
  { href: "/catalog",      label: "Customer Catalog", icon: "🌐" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => { onClose(); }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            display: "none",
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)",
            zIndex: 39,
          }}
          className="mobile-backdrop"
        />
      )}

      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        {/* Brand */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1e2333", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #D4AF37, #F0D060)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              ◆ Stone ERP
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2, letterSpacing: "0.05em" }}>
              FABRICATION MANAGEMENT
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "9px 10px", borderRadius: 8, marginBottom: 1,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#D4AF37" : "#6b7280",
                background: active ? "rgba(212,175,55,0.08)" : "transparent",
                textDecoration: "none",
                borderLeft: active ? "2px solid #D4AF37" : "2px solid transparent",
                transition: "all 0.12s",
              }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2333" }}>
          <div style={{ fontSize: 10, color: "#374151" }}>v1.0.0 · Stone ERP</div>
        </div>
      </aside>
    </>
  );
}
