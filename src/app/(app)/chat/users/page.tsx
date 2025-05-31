
// src/app/(app)/chat/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import type { AppUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Users, MessageCircle, PanelLeftClose, PanelRightClose, Search } from 'lucide-react';
import { getOneToOneConversationId } from '@/lib/chatUtils';
import ChatInterface from '../chat-interface';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

export default function OneOnOneChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isLoadingAppUsers, setIsLoadingAppUsers] = useState(true);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeChatTargetName, setActiveChatTargetName] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState<string>("Select a chat");

  const [isChatListOpen, setIsChatListOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    } finally {
      setIsLoadingAppUsers(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAppUsers();
    }
  }, [authLoading, user, fetchAppUsers]);

  const handleSelectConversation = (targetUser: AppUser | 'general') => {
    if (!user) return;

    if (targetUser === 'general') {
      setActiveConversationId(GENERAL_CHAT_CONVERSATION_ID);
      const generalChatName = "Company General Chat";
      setActiveChatTargetName(generalChatName);
      setActiveChatTitle(generalChatName);
    } else {
      const conversationId = getOneToOneConversationId(user.uid, targetUser.uid);
      const chatTargetName = targetUser.displayName || targetUser.email || "User";
      setActiveConversationId(conversationId);
      setActiveChatTargetName(chatTargetName);
      setActiveChatTitle(`Chat with ${chatTargetName}`);
    }
  };

  const filteredAppUsers = appUsers.filter(appUserItem =>
    (appUserItem.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (appUserItem.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const isLoading = authLoading || isLoadingAppUsers;

  if (isLoading && !user) { // Show loader only if auth is also loading and no user yet
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
      {/* Left Panel: User List */}
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
                {/* General Chat Option */}
                <div
                  className={cn(
                    "p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                    activeConversationId === GENERAL_CHAT_CONVERSATION_ID && "bg-primary/10 border-l-4 border-primary"
                  )}
                  onClick={() => handleSelectConversation('general')}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback><MessageCircle className="h-5 w-5 text-primary"/></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className={cn("font-semibold", activeConversationId === GENERAL_CHAT_CONVERSATION_ID && "text-primary")}>
                        Company General Chat
                    </p>
                    <p className="text-xs text-muted-foreground">Talk with everyone in the company</p>
                  </div>
                </div>

                {/* 1-on-1 Chat User List */}
                {isLoadingAppUsers ? (
                    <div className="p-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                    </div>
                ) : filteredAppUsers.length === 0 && appUsers.length > 0 ? (
                    <p className="text-center text-muted-foreground py-8 px-3 text-sm">No users match your search.</p>
                ) : filteredAppUsers.length === 0 && appUsers.length === 0 ? (
                     <p className="text-center text-muted-foreground py-8 px-3 text-sm">No other users found to chat with.</p>
                ) : (
                  <div className="space-y-0">
                    {filteredAppUsers.map((appUserItem) => {
                      const convId = getOneToOneConversationId(user.uid, appUserItem.uid);
                      const isActive = activeConversationId === convId;
                      return (
                        <div 
                          key={appUserItem.uid} 
                          className={cn(
                            "p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0",
                            isActive && "bg-primary/10 border-l-4 border-primary"
                          )}
                          onClick={() => handleSelectConversation(appUserItem)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={appUserItem.photoURL || undefined} alt={appUserItem.displayName || appUserItem.email || "User"} data-ai-hint="person avatar"/>
                            <AvatarFallback>{(appUserItem.displayName || appUserItem.email || "U").substring(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className={cn("font-semibold", isActive && "text-primary")}>
                                {appUserItem.displayName || appUserItem.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{appUserItem.displayName ? appUserItem.email : "App User"}</p>
                          </div>
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

      {/* Right Panel: Chat Interface */}
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

