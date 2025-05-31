
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
    console.warn("sendMessage validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { conversationId, text, senderId, senderName } = validatedFields.data;

  // Server-side auth check (optional, but good for debugging rules)
  // Note: In Server Actions, `auth.currentUser` might not be available directly like on client.
  // Firebase Admin SDK would be more robust for server-side auth state if needed for complex scenarios.
  // For client-driven actions, the UID passed from client (senderId) is what's primarily checked against `request.auth.uid` in rules.
  console.log(`[sendMessage Action] Received data: convId=${conversationId}, senderId=${senderId}, senderName=${senderName}, text="${text}"`);
  // console.log("[sendMessage Action] Current Firebase Auth state (server-side, if available):", auth.currentUser?.uid);


  const messageData = {
    conversationId,
    senderId,
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
      // Check if it's a FirebaseError and has a code
      if ('code' in error) {
        const firebaseError = error as any; // Type assertion
        errorMessage = `Firestore Error (${firebaseError.code}): ${firebaseError.message}`;
        if (firebaseError.code === 'permission-denied') {
          errorMessage += " Please check Firestore Security Rules. Ensure the senderId in the message matches the authenticated user's UID and all required fields are present as per the rules.";
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
