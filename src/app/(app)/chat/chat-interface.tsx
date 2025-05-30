
// src/app/(app)/chat/chat-interface.tsx
'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { ChatMessage } from '@/types';
import { sendMessage, type SendMessageFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Send, Loader2, MessageSquare, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInterfaceProps {
  conversationId: string | null;
  chatTargetName: string | null;
  currentUser: User | null;
  isGeneralChat?: boolean; // To slightly alter UI for general chat if needed
  effectiveChatTitle?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="icon">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      <span className="sr-only">Send Message</span>
    </Button>
  );
}

export default function ChatInterface({
  conversationId,
  chatTargetName,
  currentUser,
  isGeneralChat = false,
  effectiveChatTitle: propEffectiveChatTitle
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialState: SendMessageFormState = { message: null, errors: {}, success: false };
  const [state, formAction] = useActionState(sendMessage, initialState);

  const [localEffectiveChatTitle, setLocalEffectiveChatTitle] = useState("Chat");

  useEffect(() => {
    if (propEffectiveChatTitle) {
        setLocalEffectiveChatTitle(propEffectiveChatTitle);
    } else if (isGeneralChat) {
      setLocalEffectiveChatTitle("Company General Chat");
    } else if (chatTargetName) {
      setLocalEffectiveChatTitle(`Chat with ${decodeURIComponent(chatTargetName)}`);
    } else if (!conversationId) {
      setLocalEffectiveChatTitle("Select a conversation");
    }
     else {
      setLocalEffectiveChatTitle("Chat");
    }
  }, [conversationId, chatTargetName, isGeneralChat, propEffectiveChatTitle]);

  useEffect(() => {
    if (!conversationId || !currentUser) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      const updates: Promise<void>[] = [];

      querySnapshot.forEach((docSnap) => {
        const message = { id: docSnap.id, ...docSnap.data() } as ChatMessage;
        fetchedMessages.push(message);

        // If the message is from the other user and not yet read by current user, mark as read
        if (message.senderId !== currentUser.uid && !message.readAt) {
          const messageRef = doc(db, 'chatMessages', docSnap.id);
          updates.push(updateDoc(messageRef, { readAt: serverTimestamp() }));
        }
      });

      setMessages(fetchedMessages);

      if (updates.length > 0) {
        Promise.all(updates).catch(error => {
          console.error("Error marking messages as read:", error);
        });
      }
    }, (error) => {
      console.error("Error fetching messages: ", error);
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

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

  if (!currentUser) {
     return (
      <Card className="w-full h-full flex flex-col items-center justify-center shadow-xl rounded-lg">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please log in to use chat.</p>
      </Card>
    );
  }

  if (!conversationId) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center shadow-xl rounded-lg">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Select a user or conversation to start chatting.</p>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="w-full h-full flex flex-col shadow-xl rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{localEffectiveChatTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p>No messages yet.</p>
                <p className="text-sm">Be the first to send a message!</p>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.senderId !== currentUser?.uid && (
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
                      msg.senderId === currentUser?.uid
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.senderId !== currentUser?.uid && (
                       <p className="text-xs font-semibold mb-0.5">{msg.senderName || 'Anonymous'}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${msg.senderId === currentUser?.uid ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground/70 justify-start'}`}>
                      <span>{msg.createdAt ? format(msg.createdAt.toDate(), 'p') : 'Sending...'}</span>
                      {msg.senderId === currentUser?.uid && (
                        <>
                          {msg.readAt ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs p-1">
                                <p>Seen at {format(msg.readAt.toDate(), 'p')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Check className="h-3.5 w-3.5" /> // Delivered
                          )}
                        </>
                      )}
                    </div>
                  </div>
                   {msg.senderId === currentUser?.uid && currentUser && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Me'} data-ai-hint="person avatar" />
                          <AvatarFallback>{currentUser.displayName?.substring(0, 1).toUpperCase() || 'M'}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{currentUser.displayName || 'You'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
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
            <input type="hidden" name="conversationId" value={conversationId || ''} />
            <input type="hidden" name="senderId" value={currentUser.uid} />
            <input type="hidden" name="senderName" value={currentUser.displayName || 'Anonymous User'} />
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
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
