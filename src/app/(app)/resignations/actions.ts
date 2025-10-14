// src/app/(app)/resignations/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee, ResignationComment } from '@/types';

const ResignationFormSchema = z.object({
  employeeId: z.string().min(1, { message: "An employee must be selected." }),
  resignationDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Resignation date is required." }),
  noticeDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Notice date is required." }),
  reason: z.string().max(500, "Reason is too long.").optional().or(z.literal('')),
  rehireEligibility: z.enum(["Eligible", "Ineligible", "Conditional"]),
  notes: z.string().max(1000, "Notes are too long.").optional().or(z.literal('')),
}).refine(data => new Date(data.resignationDate) >= new Date(data.noticeDate), {
  message: "Resignation date cannot be before the notice date.",
  path: ["resignationDate"],
});

export type AddResignationFormState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof ResignationFormSchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

export async function addResignation(
  prevState: AddResignationFormState,
  formData: FormData
): Promise<AddResignationFormState> {
  
  const validatedFields = ResignationFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    resignationDate: formData.get('resignationDate'),
    noticeDate: formData.get('noticeDate'),
    reason: formData.get('reason'),
    rehireEligibility: formData.get('rehireEligibility'),
    notes: formData.get('notes'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check the form fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const { employeeId, ...data } = validatedFields.data;

  try {
    const employeeDoc = await getDoc(doc(db, "employees", employeeId));
    if (!employeeDoc.exists()) {
      return { message: "Selected employee not found.", success: false };
    }
    const employeeName = (employeeDoc.data() as Employee).name;

    await addDoc(collection(db, 'resignations'), {
      employeeId,
      employeeName,
      ...data,
      comments: [], // Initialize with an empty comments array
      createdAt: serverTimestamp(),
    });

    revalidatePath('/resignations');

    return {
      message: "Resignation record added successfully.",
      success: true,
    };
  } catch (error) {
    console.error("Error adding resignation record:", error);
    return {
      message: error instanceof Error ? error.message : "An unknown error occurred.",
      success: false,
    };
  }
}


const AddCommentSchema = z.object({
    resignationId: z.string().min(1, { message: "Resignation ID is required." }),
    commentText: z.string().min(1, { message: "Comment cannot be empty." }).max(1000),
    authorName: z.string().min(1, { message: "Author name is required." }),
});

export type AddCommentFormState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof AddCommentSchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

export async function addCommentToResignation(
    prevState: AddCommentFormState,
    formData: FormData
): Promise<AddCommentFormState> {
    const validatedFields = AddCommentSchema.safeParse({
        resignationId: formData.get('resignationId'),
        commentText: formData.get('commentText'),
        authorName: formData.get('authorName'),
    });

    if (!validatedFields.success) {
        return {
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { resignationId, commentText, authorName } = validatedFields.data;

    try {
        const resignationDocRef = doc(db, 'resignations', resignationId);

        const newComment: ResignationComment = {
            text: commentText,
            authorName: authorName,
            createdAt: serverTimestamp() as Timestamp,
        };

        await updateDoc(resignationDocRef, {
            comments: arrayUnion(newComment)
        });

        revalidatePath('/resignations');

        return {
            message: "Comment added successfully.",
            success: true,
        };
    } catch (error) {
        console.error("Error adding comment to resignation:", error);
        return {
            message: error instanceof Error ? error.message : "Failed to add comment.",
            success: false,
        };
    }
}
