
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

  console.log(`Attempting to send message. Conversation ID: ${conversationId}, Sender ID: ${senderId}, Sender Name: ${senderName}, Text: "${text}"`);

  try {
    await addDoc(collection(db, 'chatMessages'), {
      conversationId,
      senderId,
      senderName,
      text,
      createdAt: serverTimestamp(),
    });

    // Revalidate the specific chat path using the dynamic conversationId
    revalidatePath(`/chat/${conversationId}`);
    // Also revalidate the users list in case counts or last active status needs update (future)
    revalidatePath('/chat/users');


    return {
      message: "Message sent successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error sending message to Firestore:", error);
    let errorMessage = "An unexpected error occurred while sending the message.";
    if (error instanceof Error) {
      // Check if it's a FirebaseError and has a code
      if ('code' in error) {
        errorMessage = `Firestore Error (${(error as any).code}): ${(error as Error).message}`;
      } else {
        errorMessage = error.message;
      }
    }
    return {
      message: `Sending message failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
