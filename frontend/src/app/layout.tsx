import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RootLayoutClient } from './root-layout-client';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '芸仔AI - AI工具平台',
  description: 'Yunzai AI SaaS Platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head />
      <body className={inter.className}>
        <ErrorBoundary>
          <RootLayoutClient>{children}</RootLayoutClient>
          <Toaster position="top-center" />
        </ErrorBoundary>
      </body>
    </html>
  );
}
