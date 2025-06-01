
// src/app/(app)/documents/actions.ts
'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase'; // Removed firebaseAuth as direct usage is problematic here
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { DocumentMetadata } from '@/types';

const DocumentUploadSchema = z.object({
  fileName: z.string().min(1, { message: "File name is required." }),
  fileType: z.string().min(1, { message: "File type is required." }),
  fileSize: z.number().min(1, { message: "File size must be greater than 0." }),
  category: z.string().min(1, { message: "Category is required." }),
  description: z.string().max(500, { message: "Description is too long." }).optional().or(z.literal('')),
  downloadURL: z.string().url({ message: "Download URL is required." }),
  storagePath: z.string().min(1, { message: "Storage path is required." }),
  uploadedByUid: z.string().min(1, { message: "Uploader UID is required." }),
  uploadedByName: z.string().min(1, { message: "Uploader name is required." }),
});

export type UploadDocumentFormState = {
  message: string | null;
  errors?: {
    file?: string[];
    fileName?: string[];
    fileType?: string[];
    fileSize?: string[];
    category?: string[];
    description?: string[];
    downloadURL?: string[];
    storagePath?: string[];
    uploadedByUid?: string[];
    uploadedByName?: string[];
    _form?: string[];
  };
  success?: boolean;
  newDocumentId?: string;
};

export async function saveDocumentMetadata(
  prevState: UploadDocumentFormState | undefined,
  formData: FormData
): Promise<UploadDocumentFormState> {

  const validatedFields = DocumentUploadSchema.safeParse({
    fileName: formData.get('fileName'),
    fileType: formData.get('fileType'),
    fileSize: Number(formData.get('fileSize')),
    category: formData.get('category'),
    description: formData.get('description'),
    downloadURL: formData.get('downloadURL'),
    storagePath: formData.get('storagePath'),
    uploadedByUid: formData.get('uploadedByUid'),
    uploadedByName: formData.get('uploadedByName'),
  });

  if (!validatedFields.success) {
    console.error("Validation failed for document metadata:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed for document metadata. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const {
    fileName,
    fileType,
    fileSize,
    category,
    description,
    downloadURL,
    storagePath,
    uploadedByUid,
    uploadedByName
  } = validatedFields.data;

  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      fileName,
      fileType,
      fileSize,
      category,
      description: description || '',
      downloadURL,
      storagePath,
      uploadedByUid, // Use from validated form data
      uploadedByName, // Use from validated form data
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
