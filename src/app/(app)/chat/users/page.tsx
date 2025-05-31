
// src/app/(app)/chat/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where, getCountFromServer, Timestamp } from 'firebase/firestore';
import type { AppUser, ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Users, MessageCircle, PanelLeftClose, PanelRightClose, Search } from 'lucide-react';
import { getOneToOneConversationId } from '@/lib/chatUtils';
import ChatInterface from '../chat-interface';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

export default function OneOnOneChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isLoadingAppUsers, setIsLoadingAppUsers] = useState(true);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeChatTargetName, setActiveChatTargetName] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState<string>("Select a chat");

  const [isChatListOpen, setIsChatListOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const fetchAppUsers = useCallback(async () => {
    if (!user) return; 
    setIsLoadingAppUsers(true);
    try {
      const usersCollectionRef = collection(db, "users"); 
      const q = query(usersCollectionRef, where("uid", "!=", user.uid), orderBy("displayName", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedAppUsers: AppUser[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        fetchedAppUsers.push({ 
          uid: doc.id, 
          displayName: data.displayName || "Unnamed User",
          email: data.email || "No email",
          photoURL: data.photoURL || null,
        });
      });
      setAppUsers(fetchedAppUsers);
    } catch (error) {
      console.error("Error fetching app users for chat selection:", error);
      toast({
        title: "Error Fetching Users",
        description: "Could not load the list of users for chat.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAppUsers(false);
    }
  }, [user, toast]);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setIsLoadingCounts(false);
      return;
    }
    // Only proceed if appUsers has been populated to avoid running with an empty list initially
    if (appUsers.length === 0 && !isLoadingAppUsers) { 
        setIsLoadingCounts(false);
        return;
    }


    console.log(`[ChatUsersPage] Starting to fetch unread counts. User: ${user.uid}, App Users count: ${appUsers.length}. Will perform approx ${appUsers.length + 1} count queries.`);
    setIsLoadingCounts(true);
    const counts: Record<string, number> = {};
    const promises = [];

    // General Chat
    const generalChatConvId = GENERAL_CHAT_CONVERSATION_ID;
    const generalChatQuery = query(
      collection(db, 'chatMessages'),
      where('conversationId', '==', generalChatConvId),
      where('senderId', '!=', user.uid),
      where('readAt', '==', null)
    );
    promises.push(
      getCountFromServer(generalChatQuery)
        .then(snapshot => {
          counts[generalChatConvId] = snapshot.data().count;
        })
        .catch(err => {
          console.error(`[ChatUsersPage] Error fetching unread count for General Chat (${generalChatConvId}):`, err);
          if ((err as any)?.code === 'resource-exhausted') {
            toast({
              title: "Firestore Quota Issue",
              description: "Could not fetch unread counts for General Chat due to Firestore quota limits. Please check your Firebase project usage or upgrade your plan.",
              variant: "destructive",
            });
          }
          // Optionally set count to 0 or an error indicator if needed
          counts[generalChatConvId] = 0; 
        })
    );

    // 1-on-1 Chats
    for (const appUserItem of appUsers) {
      const convId = getOneToOneConversationId(user.uid, appUserItem.uid);
      const q = query(
        collection(db, 'chatMessages'),
        where('conversationId', '==', convId),
        where('senderId', '!=', user.uid), // Messages sent by others
        where('readAt', '==', null)        // That are unread by current user
      );
      promises.push(
        getCountFromServer(q)
          .then(snapshot => {
            counts[convId] = snapshot.data().count;
          })
          .catch(err => {
            console.error(`[ChatUsersPage] Error fetching unread count for conversation ${convId}:`, err);
             if ((err as any)?.code === 'failed-precondition') {
                toast({
                    title: "Firestore Index Missing",
                    description: `An index might be required for fetching unread counts for chat. Check browser console for a link to create it. Conversation ID: ${convId}`,
                    variant: "destructive",
                });
            } else if ((err as any)?.code === 'resource-exhausted') {
              toast({
                title: "Firestore Quota Issue",
                description: `Could not fetch unread counts for chat with ${appUserItem.displayName} due to Firestore quota limits.`,
                variant: "destructive",
              });
            }
            counts[convId] = 0; // Default to 0 on error
          })
      );
    }

    try {
      await Promise.all(promises);
      // Merge with previous counts in case some promises failed, to not lose all counts
      setUnreadCounts(prevCounts => ({ ...prevCounts, ...counts })); 
    } catch (error) {
      // This catch might not be strictly necessary if individual promises handle their errors
      console.error("[ChatUsersPage] Error processing unread count promises bundle:", error);
      toast({
        title: "Error Updating Counts",
        description: "Some unread message counts might not have updated correctly.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCounts(false);
      console.log("[ChatUsersPage] Finished fetching unread counts. Current counts:", counts);
    }
  }, [user, appUsers, toast, isLoadingAppUsers]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAppUsers();
    }
  }, [authLoading, user, fetchAppUsers]);

  // Fetch unread counts when the user is available AND appUsers list has been populated
  useEffect(() => {
    if (user && appUsers.length > 0 && !isLoadingAppUsers) {
      fetchUnreadCounts();
    } else if (user && !isLoadingAppUsers && appUsers.length === 0) {
        // Case where user is loaded, appUsers fetch is done, and there are no other users.
        // Still attempt for general chat.
        // Or, if appUsers is empty, fetchUnreadCounts logic for general chat handles it.
        fetchUnreadCounts(); // Will only process general chat if appUsers is empty.
    }
  }, [user, appUsers, isLoadingAppUsers, fetchUnreadCounts]);


  const handleSelectConversation = (targetUser: AppUser | 'general') => {
    if (!user) return;
    let conversationId;
    let chatTargetName;
    let chatTitle;

    if (targetUser === 'general') {
      conversationId = GENERAL_CHAT_CONVERSATION_ID;
      chatTargetName = "Company General Chat";
      chatTitle = chatTargetName;
    } else {
      conversationId = getOneToOneConversationId(user.uid, targetUser.uid);
      chatTargetName = targetUser.displayName || targetUser.email || "User";
      chatTitle = `Chat with ${chatTargetName}`;
    }
    
    setActiveConversationId(conversationId);
    setActiveChatTargetName(chatTargetName);
    setActiveChatTitle(chatTitle);

    // Optimistically mark as read for UI
    if (conversationId) {
      setUnreadCounts(prev => ({ ...prev, [conversationId!]: 0 }));
    }
    if (window.innerWidth < 768) { // md breakpoint
        setIsChatListOpen(false);
    }
  };

  const filteredAppUsers = appUsers.filter(appUserItem =>
    (appUserItem.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (appUserItem.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const isLoading = authLoading || isLoadingAppUsers || (appUsers.length > 0 && isLoadingCounts);

  if (authLoading && !user) { 
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
    <div className="flex h-[calc(100vh-88px)] border rounded-lg shadow-xl overflow-hidden">
      <div 
        className={cn(
          "bg-card flex flex-col border-r transition-all duration-300 ease-in-out",
          isChatListOpen ? "w-full md:w-1/3 md:min-w-[300px] md:max-w-[380px]" : "w-0 min-w-0 p-0 overflow-hidden md:p-0"
        )}
      >
        {isChatListOpen && (
          <>
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center">
                  <Users className="mr-2 h-6 w-6 text-primary" />
                  Conversations
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsChatListOpen(false)} className="md:inline-flex">
                  <PanelLeftClose className="h-5 w-5" />
                  <span className="sr-only">Hide Chat List</span>
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search conversations..."
                  className="w-full rounded-lg bg-background pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="p-0">
                <div
                  className={cn(
                    "p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                    activeConversationId === GENERAL_CHAT_CONVERSATION_ID && "bg-primary/10 border-l-4 border-primary"
                  )}
                  onClick={() => handleSelectConversation('general')}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback><MessageCircle className="h-5 w-5 text-primary"/></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={cn("font-semibold", activeConversationId === GENERAL_CHAT_CONVERSATION_ID && "text-primary")}>
                          Company General Chat
                      </p>
                      <p className="text-xs text-muted-foreground">Talk with everyone</p>
                    </div>
                  </div>
                  {unreadCounts[GENERAL_CHAT_CONVERSATION_ID] > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-xs">
                      {unreadCounts[GENERAL_CHAT_CONVERSATION_ID]}
                    </Badge>
                  )}
                </div>

                {isLoadingAppUsers ? (
                    <div className="p-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                    </div>
                ) : filteredAppUsers.length === 0 && appUsers.length > 0 ? (
                    <p className="text-center text-muted-foreground py-8 px-3 text-sm">No users match your search.</p>
                ) : filteredAppUsers.length === 0 && appUsers.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8 px-3 text-sm">No other users to chat with.</p>
                ) : (
                  <div className="space-y-0">
                    {filteredAppUsers.map((appUserItem) => {
                      const convId = getOneToOneConversationId(user.uid, appUserItem.uid);
                      const isActive = activeConversationId === convId;
                      const unreadCount = unreadCounts[convId] || 0;
                      return (
                        <div 
                          key={appUserItem.uid} 
                          className={cn(
                            "p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0",
                            isActive && "bg-primary/10 border-l-4 border-primary"
                          )}
                          onClick={() => handleSelectConversation(appUserItem)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={appUserItem.photoURL || undefined} alt={appUserItem.displayName || appUserItem.email || "User"} data-ai-hint="person avatar"/>
                              <AvatarFallback>{(appUserItem.displayName || appUserItem.email || "U").substring(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                              <p className={cn("font-semibold truncate", isActive && "text-primary")}>
                                  {appUserItem.displayName || appUserItem.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{appUserItem.displayName ? appUserItem.email : "App User"}</p>
                            </div>
                          </div>
                           {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-xs shrink-0">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </>
        )}
      </div>

      <div className="flex-grow h-full">
        <ChatInterface
          conversationId={activeConversationId}
          chatTargetName={activeChatTargetName}
          currentUser={user}
          isGeneralChat={activeConversationId === GENERAL_CHAT_CONVERSATION_ID}
          effectiveChatTitle={activeChatTitle}
          isChatListCollapsed={!isChatListOpen}
          onToggleChatList={() => setIsChatListOpen(prev => !prev)}
        />
      </div>
    </div>
  );
}

    
