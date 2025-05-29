
'use client'; 

// No longer need useEffect for redirect here, AuthProvider handles it.
// import { useEffect } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppLogo } from "@/components/icons";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  // const router = useRouter(); // Not needed for redirect
  // const pathname = usePathname(); // Not needed for redirect

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect logic is now handled by AuthProvider

  const userDisplayName = user?.displayName || "User";
  const userPhotoURL = user?.photoURL;
  const avatarFallback = userDisplayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || "HR";


  return (
    <>
      <Sidebar collapsible="icon" side="left" variant="sidebar">
        <SidebarRail />
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <AppLogo className="size-7 text-primary group-data-[collapsible=icon]:size-6" />
            <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">
              HR Central
            </h1>
          </div>
        </SidebarHeader>
        <ScrollArea className="flex-grow">
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
        </ScrollArea>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:h-16 sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
              {user ? (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userPhotoURL || undefined} alt={userDisplayName} data-ai-hint="person avatar" />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
              ) : (
                // Placeholder or different UI if user is not logged in (though they should be redirected)
                <Avatar className="h-9 w-9"> 
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
