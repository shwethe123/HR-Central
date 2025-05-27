import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
import {GeistMono} from 'geist/font/mono';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster";

// const geistSans = GeistSans; // This line is not needed as GeistSans is directly used in className
// const geistMono = GeistMono; // This line is not needed as GeistMono is directly used in className

export const metadata: Metadata = {
  title: 'HR Central',
  description: 'Comprehensive HR Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <SidebarProvider>
          {children}
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
