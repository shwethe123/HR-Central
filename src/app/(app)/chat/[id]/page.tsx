
// src/app/(app)/chat/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { useSearchParams, useParams } from 'next/navigation'; // useParams for dynamic route segment
import { useFormStatus } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ChatMessage } from '@/types';
import { sendMessage, type SendMessageFormState } from '../actions'; // Adjusted path for actions
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from 'next/link';

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="icon">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      <span className="sr-only">Send Message</span>
    </Button>
  );
}

export default function DynamicChatPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const conversationId = typeof params.id === 'string' ? params.id : GENERAL_CHAT_CONVERSATION_ID;
  const chatTargetName = searchParams.get('name');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialState: SendMessageFormState = { message: null, errors: {}, success: false };
  const [state, formAction] = useActionState(sendMessage, initialState);
  
  const [effectiveChatTitle, setEffectiveChatTitle] = useState("Loading Chat...");

  useEffect(() => {
    if (conversationId === GENERAL_CHAT_CONVERSATION_ID) {
      setEffectiveChatTitle("Company General Chat");
    } else if (chatTargetName) {
      setEffectiveChatTitle(`Chat with ${decodeURIComponent(chatTargetName)}`);
    } else if (user && conversationId && conversationId !== GENERAL_CHAT_CONVERSATION_ID) {
      // Fallback: try to derive name if not in query params (more complex, needs Firestore read)
      // For now, let's assume name is passed or it's general chat
      // This part would require fetching the other user's details from Firestore based on conversationId
      const uids = conversationId.split('_');
      const otherUid = uids.find(uid => uid !== user.uid);
      if (otherUid) {
        // Placeholder: In a real app, fetch user details from Firestore here
        // For simplicity, we'll use a generic title if name is not passed for 1-on-1.
        setEffectiveChatTitle(`Chat`); 
      } else {
        setEffectiveChatTitle("Direct Chat");
      }
    }
  }, [conversationId, chatTargetName, user]);


  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, 'chatMessages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (state?.success) {
      setNewMessage('');
      formRef.current?.reset();
    }
    if (state?.errors?._form) {
      console.error("Form error:", state.errors._form.join(', '));
    }
  }, [state]);

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full h-[calc(100vh-120px)] flex flex-col shadow-xl rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {conversationId !== GENERAL_CHAT_CONVERSATION_ID && (
              <Link href="/chat/users" passHref legacyBehavior>
                <Button variant="ghost" size="icon" aria-label="Back to user list">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <CardTitle>{effectiveChatTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.senderId === user?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.senderId !== user?.uid && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={undefined} alt={msg.senderName} data-ai-hint="person avatar"/>
                          <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{msg.senderName || 'Unknown User'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      msg.senderId === user?.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.senderId !== user?.uid && (
                       <p className="text-xs font-semibold mb-0.5">{msg.senderName || 'Anonymous'}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                      {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : 'Sending...'}
                    </p>
                  </div>
                   {msg.senderId === user?.uid && user && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Me'} data-ai-hint="person avatar" />
                          <AvatarFallback>{user.displayName?.substring(0, 1).toUpperCase() || 'M'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.displayName || 'You'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          {user ? (
            <form
              ref={formRef}
              action={formAction}
              onSubmit={(e) => {
                if (!newMessage.trim()) {
                  e.preventDefault();
                }
              }}
              className="flex w-full items-center gap-2"
            >
              <input type="hidden" name="conversationId" value={conversationId} />
              <input type="hidden" name="senderId" value={user.uid} />
              <input type="hidden" name="senderName" value={user.displayName || 'Anonymous User'} />
              <Textarea
                name="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={1}
                className="flex-grow resize-none min-h-[40px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) {
                      formRef.current?.requestSubmit();
                    }
                  }
                }}
              />
              <SubmitButton />
            </form>
          ) : (
            <p className="text-sm text-muted-foreground text-center w-full">
              Please log in to send messages.
            </p>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
