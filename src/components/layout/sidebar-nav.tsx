
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquareText, Settings, LifeBuoy, LogOut, Building2, Loader2, CalendarClock, MessageCircle, User as UserIconLucide, Users2, MessageSquarePlus, FileText, Wifi, AlertTriangle } from "lucide-react"; // Added Wifi, AlertTriangle
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";


const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/employees", label: "Employees", icon: UserIconLucide },
  { href: "/teams", label: "Teams", icon: Users2 },
  { href: "/leave-requests", label: "Leave Requests", icon: CalendarClock },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/wifi-bills", label: "WiFi Bills", icon: Wifi },
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
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Closing the dialog will be handled by onAuthStateChanged leading to component unmount or state change
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show a toast for logout failure
    } finally {
      // Don't set isLoggingOut to false here if successful,
      // as the component might unmount or user state will change.
      // If error, it might be needed.
      setIsLoggingOut(false); // Keep for now, but on success, this might not be reached if redirect happens fast
      setIsLogoutAlertOpen(false); // Close dialog on completion or error
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
                  (item.label === "Direct Chats" && pathname.startsWith("/chat/users")) ||
                  (item.label === "General Chat" && pathname.startsWith(`/chat/${GENERAL_CHAT_CONVERSATION_ID}`)) ||
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
              <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
                <AlertDialogTrigger asChild>
                  <SidebarMenuButton tooltip="Log Out" onClick={() => setIsLogoutAlertOpen(true)} disabled={isLoggingOut}>
                    {isLoggingOut && isLogoutAlertOpen ? <Loader2 className="animate-spin" /> : <LogOut />}
                    <span>Log Out</span>
                  </SidebarMenuButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center">
                      <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" />
                      Confirm Logout
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to log out of HR Central?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsLogoutAlertOpen(false)} disabled={isLoggingOut}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogoutConfirm}
                      disabled={isLoggingOut}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Confirm Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
