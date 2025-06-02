
// src/app/(app)/dashboard/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Announcement } from '@/types';

const AddAnnouncementSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(150, { message: "Title is too long." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }).max(5000, { message: "Content is too long." }),
  authorName: z.string().min(2, {message: "Author name must be at least 2 characters."}).max(100, {message: "Author name is too long."}).optional().or(z.literal('')),
  // publishedAt: z.string().optional(), // For future scheduling feature
  // status: z.enum(['published', 'draft']).default('published'), // For future draft feature
});

export type AddAnnouncementFormState = {
  message: string | null;
  errors?: {
    title?: string[];
    content?: string[];
    authorName?: string[];
    // publishedAt?: string[];
    // status?: string[];
    _form?: string[];
  };
  success?: boolean;
  newAnnouncementId?: string;
};

export async function addAnnouncement(
  prevState: AddAnnouncementFormState | undefined,
  formData: FormData
): Promise<AddAnnouncementFormState> {
  const validatedFields = AddAnnouncementSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    authorName: formData.get('authorName'),
  });

  if (!validatedFields.success) {
    console.error("Validation failed for addAnnouncement:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { title, content, authorName } = validatedFields.data;

  try {
    const docRef = await addDoc(collection(db, 'announcements'), {
      title,
      content,
      authorName: authorName || 'HR Department', // Default author if not provided
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(), // For now, publish immediately
      status: 'published',
    } as Omit<Announcement, 'id' | 'createdAt' | 'publishedAt'> & { createdAt: any, publishedAt: any });

    revalidatePath('/dashboard');

    return {
      message: `Announcement "${title}" created successfully.`,
      success: true,
      newAnnouncementId: docRef.id,
    };
  } catch (error) {
    console.error("Error creating announcement in Firestore:", error);
    let errorMessage = "An unexpected error occurred while creating the announcement.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Creating announcement failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
