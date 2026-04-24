import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORUX Agent Command — Obsidian Ecosystem',
  description: '3D interactive command center for the Obsidian multi-agent trading civilization.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Cinzel:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void-black text-lunar-silver font-sans antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
