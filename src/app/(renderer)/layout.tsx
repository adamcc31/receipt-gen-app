/**
 * Renderer Layout
 * 
 * Minimal layout for Puppeteer rendering (no UI shell)
 */

import { Inter } from 'next/font/google';
import '@/app/globals.css';

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
});

export default function RendererLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <style>{`
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        `}</style>
            </head>
            <body className={inter.variable}>
                {children}
            </body>
        </html>
    );
}
