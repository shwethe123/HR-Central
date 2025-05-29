
// src/app/(app)/chat/page.tsx
'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ChatMessage } from '@/types';
import { sendMessage, type SendMessageFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Send, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="icon">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      <span className="sr-only">Send Message</span>
    </Button>
  );
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth(); 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialState: SendMessageFormState = { message: null, errors: {}, success: false };
  const [state, formAction] = useActionState(sendMessage, initialState);

  useEffect(() => {
    const q = query(collection(db, 'generalChatMessages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (state?.success) {
      setNewMessage(''); // Clear input on successful send
      formRef.current?.reset(); // Reset the native form element
    }
    if (state?.errors?._form) {
      console.error("Form error:", state.errors._form.join(', '));
    }
  }, [state]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMessage.trim() || !user) return;

    const formData = new FormData(event.currentTarget);
    formAction(formData);
  };
  
  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full h-[calc(100vh-120px)] flex flex-col shadow-xl rounded-lg">
      <CardHeader>
        <CardTitle>Company General Chat</CardTitle>
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} alt={msg.senderName} data-ai-hint="person avatar"/>
                    <AvatarFallback>{msg.senderName?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Me'} data-ai-hint="person avatar" />
                    <AvatarFallback>{user.displayName?.substring(0, 1).toUpperCase() || 'M'}</AvatarFallback>
                  </Avatar>
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
            action={formAction} // Using Server Action
            onSubmit={(e) => { // Client-side onSubmit for effects like clearing input or preventing empty submission
              if (!newMessage.trim()) {
                e.preventDefault(); // Prevent submitting empty messages if not handled by server action validation
              }
              // The actual submission is handled by the form's 'action' prop.
              // We don't call formAction(formData) here directly if we're using the native form submission for the server action.
            }}
            className="flex w-full items-center gap-2"
          >
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
  );
}
