
// src/app/(app)/chat/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
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
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { conversationId, text, senderId, senderName } = validatedFields.data;

  try {
    // Note: The collection name 'generalChatMessages' might be misleading now.
    // Consider renaming to 'chatMessages' if this collection will hold all messages.
    // For now, we'll keep it as is to minimize breaking changes, but it's a good point for future refactor.
    await addDoc(collection(db, 'chatMessages'), { // Changed collection name to 'chatMessages'
      conversationId,
      senderId,
      senderName,
      text,
      createdAt: serverTimestamp(),
    });

    // Revalidate the specific chat path if dynamic paths are used later for conversations
    // For now, revalidating the general chat path is fine.
    revalidatePath('/chat');

    return {
      message: "Message sent successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error sending message to Firestore:", error);
    let errorMessage = "An unexpected error occurred while sending the message.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Sending message failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
