
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquareText, Settings, LifeBuoy, LogOut, Building2, Loader2, CalendarClock, MessageCircle, User as UserIconLucide, Users2, MessageSquarePlus } from "lucide-react"; // Added Users2, MessageSquarePlus
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

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/employees", label: "Employees", icon: UserIconLucide },
  { href: "/teams", label: "Teams", icon: Users2 },
  { href: "/leave-requests", label: "Leave Requests", icon: CalendarClock },
  // Updated Chat Links
  { href: `/chat/${GENERAL_CHAT_CONVERSATION_ID}?name=Company%20General%20Chat`, label: "General Chat", icon: MessageCircle },
  { href: "/chat/users", label: "Direct Chats", icon: MessageSquarePlus }, 
  { href: "/feedback", label: "Feedback Analysis", icon: MessageSquareText },
  { href: "/company-departments", label: "Company Depts.", icon: Building2 },
];

const accountNavItems = [
  { href: "/profile", label: "Profile", icon: UserIconLucide },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { logout, user, loading: authLoading } = useAuth(); 
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false); 
    }
  };
  
  if (authLoading && !user) {
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
                isActive={
                  pathname === item.href || 
                  (item.label === "Direct Chats" && pathname.startsWith("/chat/users")) || // Special case for main chat page
                  (item.label === "General Chat" && pathname.startsWith(`/chat/${GENERAL_CHAT_CONVERSATION_ID}`)) || // Special case for general chat
                  (item.href !== "/dashboard" && 
                   !item.href.startsWith("/chat/users") && 
                   !item.href.startsWith(`/chat/${GENERAL_CHAT_CONVERSATION_ID}`) && 
                   pathname.startsWith(item.href))
                }
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
        <SidebarGroupLabel>Account</SidebarGroupLabel>
        <SidebarMenu>
          {accountNavItems.map((item) => (
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
