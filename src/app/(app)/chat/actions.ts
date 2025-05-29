
// src/app/(app)/chat/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const SendMessageSchema = z.object({
  text: z.string().min(1, { message: "Message cannot be empty." }).max(1000, { message: "Message is too long." }),
  senderId: z.string().min(1, { message: "Sender ID is required." }),
  senderName: z.string().min(1, { message: "Sender name is required." }),
});

export type SendMessageFormState = {
  message: string | null;
  errors?: {
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

  const { text, senderId, senderName } = validatedFields.data;

  try {
    await addDoc(collection(db, 'generalChatMessages'), {
      senderId,
      senderName,
      text,
      createdAt: serverTimestamp(),
    });

    // Revalidation might not be strictly necessary if client uses onSnapshot,
    // but can be useful if there are other ways the chat page data is fetched.
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
