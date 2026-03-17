"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",            label: "Dashboard",    icon: "▦" },
  { href: "/customers",   label: "Customers",    icon: "👥" },
  { href: "/products",    label: "Products",     icon: "🪨" },
  { href: "/inventory",   label: "Inventory",    icon: "📦" },
  { href: "/quotes",      label: "Quotes",       icon: "📋" },
  { href: "/jobs",        label: "Jobs",         icon: "🔨" },
  { href: "/holds",       label: "Holds",        icon: "🔒" },
  { href: "/sales-orders",label: "Sales Orders", icon: "🛒" },
  { href: "/deliveries",  label: "Deliveries",   icon: "🚚" },
  { href: "/purchasing",  label: "Purchasing",   icon: "📥" },
  { href: "/reports",     label: "Reports",      icon: "📊" },
  { href: "/drawing",     label: "Drawing Tool", icon: "✏️" },
  { href: "/settings",    label: "Settings",     icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 232, minWidth: 232,
      background: "#0d0f16",
      borderRight: "1px solid #1e2333",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1e2333" }}>
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

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {navItems.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 8, marginBottom: 1,
              fontSize: 13, fontWeight: active ? 600 : 400,
              color: active ? "#D4AF37" : "#6b7280",
              background: active ? "rgba(212,175,55,0.08)" : "transparent",
              textDecoration: "none",
              borderLeft: active ? "2px solid #D4AF37" : "2px solid transparent",
              transition: "all 0.12s",
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
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
  );
}
