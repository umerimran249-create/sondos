import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Stone ERP',
  description: 'ERP + CRM for stone fabrication companies',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: '#0b0d11', color: '#f1f5f9' }}>
        {children}
      </body>
    </html>
  );
}
