
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquareText, Settings, LifeBuoy, LogOut, Building2, Loader2, CalendarClock, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/auth-context'; 
import { useState } from "react"; 

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/leave-requests", label: "Leave Requests", icon: CalendarClock },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/feedback", label: "Feedback Analysis", icon: MessageSquareText },
  { href: "/company-departments", label: "Company Departments", icon: Building2 },
];

const secondaryNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  // { href: "/support", label: "Support", icon: LifeBuoy }, // Support page not yet created
];

export function SidebarNav() {
  const pathname = usePathname();
  const { logout, user, loading: authLoading } = useAuth(); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Redirect is handled by AuthContext
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false); 
    }
  };

  // Don't render sidebar content if auth is loading initially.
  // Once loading is false, sidebar should render based on user state (which might be null if not logged in, but AuthProvider handles redirect)
  if (authLoading) { 
    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      
      <Separator className="my-2" />

      <SidebarGroup>
        <SidebarGroupLabel>Other</SidebarGroupLabel>
        <SidebarMenu>
          {secondaryNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {user && ( 
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Log Out" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                <span>Log Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
