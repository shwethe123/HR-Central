
import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
// import {GeistMono} from 'geist/font/mono'; // Removed as it's not used
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context'; 

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
      <body className={`${GeistSans.className} antialiased`}> {/* Use .className for GeistSans */}
        <AuthProvider> 
          <SidebarProvider>
            {children}
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
