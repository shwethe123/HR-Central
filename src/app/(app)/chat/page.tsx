
// This file is no longer needed as chat UI is handled by /app/(app)/chat/[id]/page.tsx
// We can delete this file. For now, just redirecting or leaving empty.
// To avoid 404 if someone lands on /chat directly, redirect to general chat or user selection.

import { redirect } from 'next/navigation';

const GENERAL_CHAT_CONVERSATION_ID = "general_company_chat";

export default function ChatRedirectPage() {
  // Redirect to the general company chat by default or to the user selection page
  // Let's redirect to the user selection page if /chat is accessed directly
  redirect(`/chat/users`);
  // Or redirect to general chat:
  // redirect(`/chat/${GENERAL_CHAT_CONVERSATION_ID}?name=Company%20General%20Chat`);
  return null; 
}
