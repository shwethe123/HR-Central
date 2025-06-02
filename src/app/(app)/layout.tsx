
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { Bell, Search, Loader2, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import type { Announcement } from '@/types';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, setUser: setAuthUser } = useAuth(); // Added setAuthUser from useAuth
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  useEffect(() => {
    const fetchLatestAnnouncements = async () => {
      setLoadingAnnouncements(true);
      try {
        const announcementsRef = collection(db, 'announcements');
        const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5)); // Fetching 5 announcements
        const querySnapshot = await getDocs(q);
        const fetchedAnnouncements: Announcement[] = [];
        querySnapshot.forEach((doc) => {
          fetchedAnnouncements.push({ id: doc.id, ...doc.data() } as Announcement);
        });
        setAnnouncements(fetchedAnnouncements);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchLatestAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length > 1) {
      const timer = setInterval(() => {
        setCurrentAnnouncementIndex((prevIndex) =>
          (prevIndex + 1) % announcements.length
        );
      }, 10000); // Change every 10 seconds
      return () => clearInterval(timer);
    }
  }, [announcements]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Derive user details directly from the user object from context
  const userDisplayName = user?.displayName || "User";
  const userPhotoURL = user?.photoURL;
  const avatarFallback = userDisplayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || "HR";
  const currentAnnouncement = announcements[currentAnnouncementIndex];

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

          {/* Announcement Ticker */}
          <div className="flex-1 flex items-center overflow-hidden">
            {loadingAnnouncements ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading announcements...
              </div>
            ) : announcements.length > 0 && currentAnnouncement ? (
              <div className="flex items-center w-full max-w-2xl">
                <Megaphone className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                <div className="relative flex-1 overflow-hidden h-6">
                  <div
                    className="absolute whitespace-nowrap text-sm text-muted-foreground"
                    style={{
                      animationName: 'ticker-scroll',
                      animationDuration: `${Math.max(15, currentAnnouncement.title.length / 2)}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                      animationPlayState: 'running', // Explicitly set play state
                      willChange: 'transform'
                    }}
                  >
                    {currentAnnouncement.title}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {/* Optionally show "No announcements" or keep it blank */}
              </div>
            )}
          </div>

          {/* Search and User Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>

            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            <Avatar className="h-9 w-9">
              <AvatarImage src={userPhotoURL || undefined} alt={userDisplayName} data-ai-hint="person avatar"/>
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>

      <style jsx global>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        /* The :hover rule to pause was on .announcement-ticker-container which isn't directly on the animated element's parent */
        /* To make it work, the hover would need to be on the parent of the animated div or handled with JS */
        /* For now, this CSS rule might not be effective as structured. */
        .announcement-ticker-container:hover .announcement-ticker-content {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
