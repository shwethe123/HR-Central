
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquareText, Settings, LifeBuoy, LogOut, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
// import { AppLogo } from "@/components/icons"; // AppLogo is in SidebarHeader now
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context"; 
import { useState } from "react"; 

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/feedback", label: "Feedback Analysis", icon: MessageSquareText },
  { href: "/company-departments", label: "Company Departments", icon: Building2 },
];

const secondaryNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { logout, user, loading: authLoading } = useAuth(); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Redirect is handled by AuthContext or AppLayout
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show an error toast to the user
      setIsLoggingOut(false); // Reset on error
    }
    // setIsLoggingOut(false) will be implicitly handled if logout leads to unmount or redirect
  };

  // Don't render sidebar content if auth is loading.
  // Allow rendering even if user is null for now, as auth is "disabled".
  if (authLoading) { 
    return null;
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
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
