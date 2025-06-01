
// src/app/(app)/documents/actions.ts
'use server';

import { z } from 'zod';
import { db, storage, auth as firebaseAuth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { DocumentMetadata } from '@/types'; // Ensure this type is defined

const DocumentUploadSchema = z.object({
  fileName: z.string().min(1, { message: "File name is required." }),
  fileType: z.string().min(1, { message: "File type is required." }),
  fileSize: z.number().min(1, { message: "File size must be greater than 0." }),
  category: z.string().min(1, { message: "Category is required." }),
  description: z.string().max(500, { message: "Description is too long." }).optional().or(z.literal('')),
  // storagePath and downloadURL will be added after successful upload
  // uploadedByUid and uploadedByName will be taken from the authenticated user
});

export type UploadDocumentFormState = {
  message: string | null;
  errors?: {
    file?: string[]; // For general file errors during upload
    fileName?: string[];
    fileType?: string[];
    fileSize?: string[];
    category?: string[];
    description?: string[];
    _form?: string[];
  };
  success?: boolean;
  newDocumentId?: string;
};

// This action is designed to be called by the client after it uploads the file to Firebase Storage directly.
// The client will then pass the downloadURL and storagePath to this action.
export async function saveDocumentMetadata(
  prevState: UploadDocumentFormState | undefined,
  formData: FormData
): Promise<UploadDocumentFormState> {

  const currentUser = firebaseAuth.currentUser; // This might be null on server actions if not handled carefully
                                            // Better to get UID/Name on client and pass it, or ensure auth state is available

  if (!currentUser) {
    return {
      message: "Authentication required to upload documents.",
      errors: { _form: ["User not authenticated."] },
      success: false,
    };
  }

  const validatedFields = DocumentUploadSchema.safeParse({
    fileName: formData.get('fileName'),
    fileType: formData.get('fileType'),
    fileSize: Number(formData.get('fileSize')),
    category: formData.get('category'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed for document metadata. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const downloadURL = formData.get('downloadURL') as string;
  const storagePath = formData.get('storagePath') as string;

  if (!downloadURL || !storagePath) {
    return {
        message: "File upload information (downloadURL or storagePath) is missing.",
        errors: { _form: ["File upload information is missing."] },
        success: false,
    };
  }

  const { fileName, fileType, fileSize, category, description } = validatedFields.data;

  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      fileName,
      fileType,
      fileSize,
      category,
      description: description || '',
      downloadURL,
      storagePath,
      uploadedByUid: currentUser.uid,
      uploadedByName: currentUser.displayName || currentUser.email || "Unknown User",
      uploadedAt: serverTimestamp(),
    } as Omit<DocumentMetadata, 'id'>);

    revalidatePath('/documents'); 

    return {
      message: `Document "${fileName}" metadata saved successfully.`,
      success: true,
      newDocumentId: docRef.id,
    };
  } catch (error) {
    console.error("Error saving document metadata to Firestore:", error);
    let errorMessage = "An unexpected error occurred while saving document metadata.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Saving document metadata failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}

// Note: Actual file upload to Firebase Storage should be handled client-side
// due to complexities with streaming files through Server Actions.
// This server action is primarily for saving the metadata AFTER the client confirms upload.
