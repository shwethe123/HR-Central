
// src/app/(app)/chat/actions.ts
'use server';

import { z } from 'zod';
import { db, auth } from '@/lib/firebase'; // Import auth for checking current user server-side
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const SendMessageSchema = z.object({
  conversationId: z.string().min(1, { message: "Conversation ID is required." }),
  text: z.string().min(1, { message: "Message cannot be empty." }).max(1000, { message: "Message is too long." }),
  senderId: z.string().min(1, { message: "Sender ID is required." }),
  senderName: z.string().min(1, { message: "Sender name is required." }),
});

export type SendMessageFormState = {
  message: string | null;
  errors?: {
    conversationId?: string[];
    text?: string[];
    senderId?: string[];
    senderName?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export async function sendMessage(
  prevState: SendMessageFormState | undefined,
  formData: FormData
): Promise<SendMessageFormState> {
  const validatedFields = SendMessageSchema.safeParse({
    conversationId: formData.get('conversationId'),
    text: formData.get('text'),
    senderId: formData.get('senderId'),
    senderName: formData.get('senderName'),
  });

  if (!validatedFields.success) {
    console.warn("[sendMessage Action] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { conversationId, text, senderId, senderName } = validatedFields.data;

  // Server-side log to show what is being attempted
  console.log(`[sendMessage Action] Attempting to send message. Passed senderId: ${senderId}, Passed senderName: ${senderName}, For conversationId: ${conversationId}`);
  console.log(`[sendMessage Action] Message text: "${text}"`);
  // Note: auth.currentUser from client-side Firebase JS SDK import might not represent the calling user in a Server Action.
  // Firestore rules rely on `request.auth` which is derived from the client's Firebase ID token.

  const messageData = {
    conversationId,
    senderId, // This MUST match request.auth.uid in Firestore rules
    senderName,
    text,
    createdAt: serverTimestamp(), // Ensure createdAt is always set
    readAt: null, // Initialize readAt as null
  };

  console.log("[sendMessage Action] Data to be sent to Firestore:", JSON.stringify(messageData, null, 2));


  try {
    await addDoc(collection(db, 'chatMessages'), messageData);
    console.log(`[sendMessage Action] Message successfully sent to Firestore for conversationId: ${conversationId}`);

    revalidatePath(`/chat/${conversationId}`);
    revalidatePath('/chat/users');

    return {
      message: "Message sent successfully.",
      success: true,
    };
  } catch (error) {
    console.error("[sendMessage Action] Error sending message to Firestore:", error);
    let errorMessage = "An unexpected error occurred while sending the message.";
    if (error instanceof Error) {
      if ('code' in error) {
        const firebaseError = error as any; 
        errorMessage = `Firestore Error (${firebaseError.code}): ${firebaseError.message}`;
        if (firebaseError.code === 'permission-denied') {
          errorMessage = `Firestore PERMISSION_DENIED: Message sending failed.
          1. Client-Side: Ensure you are properly logged in when trying to send a message. The senderId ('${senderId}') must be your authenticated User ID.
          2. Firestore Rules: Verify your Firestore Security Rules in the Firebase Console. The rules must allow 'create' operations on the 'chatMessages' collection for authenticated users where 'request.auth.uid' matches the 'senderId' in the message, and all required fields are present.
          Example rule: \`allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid;\``;
        }
      } else {
        errorMessage = error.message;
      }
    }
    console.error("[sendMessage Action] Detailed error message being returned to client:", errorMessage);
    return {
      message: `Sending message failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
