
// src/app/(app)/chat/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import ChatInterface from '../chat-interface'; // Import the new ChatInterface component
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

export default function DynamicChatPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const conversationId = typeof params.id === 'string' ? params.id : null;
  const chatTargetNameQuery = searchParams.get('name');

  const [effectiveChatTitle, setEffectiveChatTitle] = useState("Loading Chat...");

  useEffect(() => {
    if (!conversationId) {
        console.warn("No conversation ID found in DynamicChatPage params.");
        router.push('/chat/users'); 
        return;
    }

    if (conversationId === GENERAL_CHAT_CONVERSATION_ID) {
      setEffectiveChatTitle("Company General Chat");
    } else if (chatTargetNameQuery) {
      setEffectiveChatTitle(`Chat with ${decodeURIComponent(chatTargetNameQuery)}`);
    } else if (user && conversationId !== GENERAL_CHAT_CONVERSATION_ID) {
      const uids = conversationId.split('_');
      const otherUid = uids.find(uid => uid !== user.uid);
      if (otherUid) {
        setEffectiveChatTitle(`Direct Chat`); 
      } else {
        setEffectiveChatTitle("Direct Chat");
      }
    }
  }, [conversationId, chatTargetNameQuery, user, router]);


  if (authLoading || !conversationId) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-88px)] flex flex-col">
        {conversationId !== GENERAL_CHAT_CONVERSATION_ID && (
          <div className="p-2 border-b bg-card">
            <Link href="/chat/users" passHref legacyBehavior>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Conversations
              </Button>
            </Link>
          </div>
        )}
        <ChatInterface
            conversationId={conversationId}
            chatTargetName={chatTargetNameQuery}
            currentUser={user}
            isGeneralChat={conversationId === GENERAL_CHAT_CONVERSATION_ID}
            effectiveChatTitle={effectiveChatTitle}
        />
    </div>
  );
}
