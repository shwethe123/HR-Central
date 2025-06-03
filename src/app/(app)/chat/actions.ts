
// src/app/(app)/chat/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const MAX_TEXT_LENGTH = 1000;
const MAX_FILENAME_LENGTH = 255;

const SendMessageSchema = z.object({
  conversationId: z.string().min(1, { message: "Conversation ID is required." }),
  senderId: z.string().min(1, { message: "Sender ID is required." }),
  senderName: z.string().min(1, { message: "Sender name is required." }),
  senderPhotoURL: z.string().url({ message: "Invalid sender photo URL." }).or(z.literal('')).optional(),
  messageType: z.enum(['text', 'image', 'file', 'system']),
  text: z.string().max(MAX_TEXT_LENGTH, { message: `Message is too long (max ${MAX_TEXT_LENGTH} chars).` }).optional(),
  fileURL: z.string().url({ message: "Invalid file URL." }).optional(),
  fileName: z.string().max(MAX_FILENAME_LENGTH, {message: `Filename too long (max ${MAX_FILENAME_LENGTH} chars).`}).optional(),
  fileType: z.string().optional(),
  fileSize: z.number().positive({ message: "File size must be positive." }).optional(),
}).refine(data => {
  if (data.messageType === 'text') {
    return !!data.text && data.text.trim().length > 0;
  }
  return true;
}, {
  message: "Text message cannot be empty.",
  path: ['text'],
}).refine(data => {
  if (data.messageType === 'image' || data.messageType === 'file') {
    return !!data.fileURL && !!data.fileName && !!data.fileType && !!data.fileSize;
  }
  return true;
}, {
  message: "File URL, name, type, and size are required for file/image messages.",
  path: ['fileURL'], // Or a more general path like _form if it applies to multiple fields
});


export type SendMessageFormState = {
  message: string | null;
  errors?: {
    conversationId?: string[];
    senderId?: string[];
    senderName?: string[];
    senderPhotoURL?: string[];
    messageType?: string[];
    text?: string[];
    fileURL?: string[];
    fileName?: string[];
    fileType?: string[];
    fileSize?: string[];
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
    senderId: formData.get('senderId'),
    senderName: formData.get('senderName'),
    senderPhotoURL: formData.get('senderPhotoURL'),
    messageType: formData.get('messageType'),
    text: formData.get('text'),
    fileURL: formData.get('fileURL'),
    fileName: formData.get('fileName'),
    fileType: formData.get('fileType'),
    fileSize: formData.get('fileSize') ? Number(formData.get('fileSize')) : undefined,
  });

  if (!validatedFields.success) {
    console.warn("[sendMessage Action] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const {
    conversationId,
    senderId,
    senderName,
    senderPhotoURL,
    messageType,
    text,
    fileURL,
    fileName,
    fileType,
    fileSize
  } = validatedFields.data;

  // Server-side log
  console.log(`[sendMessage Action] Attempting to send ${messageType} message. ConversationId: ${conversationId}`);

  const messageData: any = {
    conversationId,
    senderId,
    senderName,
    senderPhotoURL: senderPhotoURL || null,
    messageType,
    createdAt: serverTimestamp(),
    readAt: null,
  };

  if (messageType === 'text' && text) {
    messageData.text = text;
  } else if ((messageType === 'image' || messageType === 'file') && fileURL && fileName && fileType && fileSize) {
    messageData.fileURL = fileURL;
    messageData.fileName = fileName;
    messageData.fileType = fileType;
    messageData.fileSize = fileSize;
    // Optionally add a short text if provided with a file, e.g., as a caption
    if (text) messageData.text = text;
  } else if (messageType === 'system') {
    // For system messages, only text might be relevant
    if (text) messageData.text = text;
    else {
        console.error("[sendMessage Action] System message requires text.");
        return { message: "System message requires text.", success: false };
    }
  }
   else {
    console.error(`[sendMessage Action] Invalid message type or missing required fields for type: ${messageType}`);
    return {
      message: `Invalid message type or missing required fields for type: ${messageType}`,
      errors: { _form: [`Invalid message type or missing required fields for type: ${messageType}`] },
      success: false,
    };
  }

  console.log("[sendMessage Action] Data to be sent to Firestore:", JSON.stringify(messageData, null, 2));

  try {
    await addDoc(collection(db, 'chatMessages'), messageData);
    console.log(`[sendMessage Action] Message successfully sent to Firestore for conversationId: ${conversationId}`);

    revalidatePath(`/chat/${conversationId}`);
    revalidatePath('/chat/users'); // To update last message previews if any

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
          errorMessage = `Firestore PERMISSION_DENIED: Message sending failed. Ensure senderId ('${senderId}') matches auth.uid and rules allow creation.`;
        }
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
