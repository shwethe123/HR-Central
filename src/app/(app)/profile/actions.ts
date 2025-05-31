
// src/app/(app)/profile/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { User } from 'firebase/auth'; // For type reference if needed

const UpdateUserPhotoSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  newPhotoURL: z.string().url({ message: "A valid photo URL is required." }).or(z.literal('')), // Allow empty string for removing photo
});

export type UpdateUserPhotoResponseState = {
  message: string | null;
  errors?: {
    userId?: string[];
    newPhotoURL?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export async function updateUserFirestorePhoto(
  input: { userId: string; newPhotoURL: string; }
): Promise<UpdateUserPhotoResponseState> {
  const validatedFields = UpdateUserPhotoSchema.safeParse(input);

  if (!validatedFields.success) {
    console.error("Validation failed for updateUserFirestorePhoto:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { userId, newPhotoURL } = validatedFields.data;
  console.log(`[Server Action] Attempting to update Firestore for user ${userId} with new photoURL: ${newPhotoURL}`);

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      photoURL: newPhotoURL, // Update the photoURL field
    });
    console.log(`[Server Action] Firestore updated successfully for user ${userId}.`);

    // Revalidate paths where user avatar might be displayed
    revalidatePath('/profile'); // Revalidate the profile page itself
    revalidatePath('/(app)', 'layout'); // Revalidate the main app layout (for header avatar)
                                        // Or more specific if you know exact paths, e.g. revalidatePath('/dashboard') if avatar is there
                                        // Using 'layout' should revalidate pages using that layout.

    return {
      message: "Profile photo updated in database successfully.",
      success: true,
    };
  } catch (error) {
    console.error("[Server Action] Error updating user photo in Firestore:", error);
    let errorMessage = "An unexpected error occurred while updating profile photo in database.";
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error && (error as any).code === 'permission-denied') {
        errorMessage = `Firestore Permission Denied: ${error.message}. Please check your Firestore Security Rules for the 'users' collection.`;
      }
    }
    return {
      message: `Database update failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
