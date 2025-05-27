"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquareText, Settings, LifeBuoy, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/icons";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/feedback", label: "Feedback Analysis", icon: MessageSquareText },
];

const secondaryNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function SidebarNav() {
  const pathname = usePathname();

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
            <SidebarMenuButton tooltip="Log Out">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
