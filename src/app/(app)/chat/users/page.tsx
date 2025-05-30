
// src/app/(app)/chat/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore'; // Added where
import type { AppUser } from '@/types'; // Changed Employee to AppUser
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Users } from 'lucide-react';
import { getOneToOneConversationId } from '@/lib/chatUtils';
import { useRouter } from 'next/navigation';

export default function SelectUserForChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]); // Changed employees to appUsers
  const [isLoadingAppUsers, setIsLoadingAppUsers] = useState(true); // Changed isLoadingEmployees
  const router = useRouter();

  const fetchAppUsers = useCallback(async () => {
    if (!user) return; 
    setIsLoadingAppUsers(true);
    try {
      // Query the 'users' collection instead of 'employees'
      const usersCollectionRef = collection(db, "users"); 
      // Exclude the current user from the list
      const q = query(usersCollectionRef, where("uid", "!=", user.uid), orderBy("displayName", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedAppUsers: AppUser[] = [];
      querySnapshot.forEach(doc => {
        // Ensure all AppUser fields are mapped, providing defaults if necessary
        const data = doc.data();
        fetchedAppUsers.push({ 
          uid: doc.id, 
          displayName: data.displayName || "Unnamed User",
          email: data.email || "No email",
          photoURL: data.photoURL || null,
          // lastSeen: data.lastSeen, // if you want to use lastSeen
        });
      });
      setAppUsers(fetchedAppUsers);
    } catch (error) {
      console.error("Error fetching app users for chat selection:", error);
    } finally {
      setIsLoadingAppUsers(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAppUsers();
    }
  }, [authLoading, user, fetchAppUsers]);

  const handleStartChat = (selectedUser: AppUser) => {
    if (!user || !selectedUser.uid) {
      console.error("Current user or selected user UID is missing.");
      return;
    }
    const conversationId = getOneToOneConversationId(user.uid, selectedUser.uid);
    // Use selectedUser.displayName, fall back to email if displayName is null or empty
    const chatTargetName = encodeURIComponent(selectedUser.displayName || selectedUser.email || "User");
    router.push(`/chat/${conversationId}?name=${chatTargetName}`);
  };

  const isLoading = authLoading || isLoadingAppUsers;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">
          {authLoading ? "Authenticating..." : "Loading users..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <p className="text-muted-foreground">Please log in to start a chat.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Start a New Chat
          </CardTitle>
          <CardDescription>Select a user to start a one-on-one conversation.</CardDescription>
        </CardHeader>
        <CardContent>
          {appUsers.length === 0 && !isLoadingAppUsers ? (
            <p className="text-center text-muted-foreground py-8">No other users found to chat with.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {appUsers.map((appUserItem) => ( // Renamed to avoid conflict with AppUser type
                  <Card 
                    key={appUserItem.uid} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleStartChat(appUserItem)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={appUserItem.photoURL || undefined} alt={appUserItem.displayName || appUserItem.email || "User"} data-ai-hint="person avatar" />
                          <AvatarFallback>{(appUserItem.displayName || appUserItem.email || "U").substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{appUserItem.displayName || appUserItem.email}</p>
                           <p className="text-xs text-muted-foreground">{appUserItem.displayName ? appUserItem.email : "App User"}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Chat with ${appUserItem.displayName || appUserItem.email}`}>
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
