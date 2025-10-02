'use client';

import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}
