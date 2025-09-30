// src/app/(app)/developer-attendance/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const AddDeveloperLeaveSchema = z.object({
  developerId: z.string().min(1, { message: "Developer must be selected." }),
  developerName: z.string().min(1, { message: "Developer name is required." }),
  leaveDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "A valid leave date is required." }),
  reason: z.string().max(500, "Reason is too long.").optional().or(z.literal('')),
});

export type AddDeveloperLeaveState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof AddDeveloperLeaveSchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

export async function addDeveloperLeave(
  prevState: AddDeveloperLeaveState,
  formData: FormData
): Promise<AddDeveloperLeaveState> {
  const validatedFields = AddDeveloperLeaveSchema.safeParse({
    developerId: formData.get('developerId'),
    developerName: formData.get('developerName'),
    leaveDate: formData.get('leaveDate'),
    reason: formData.get('reason'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check the form fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  try {
    await addDoc(collection(db, 'developerAttendances'), {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    });

    revalidatePath('/developer-attendance');

    return {
      message: `Leave day for ${validatedFields.data.developerName} on ${validatedFields.data.leaveDate} has been recorded.`,
      success: true,
    };
  } catch (error) {
    console.error("Error adding developer leave record:", error);
    return {
      message: error instanceof Error ? error.message : "An unknown server error occurred.",
      success: false,
    };
  }
}
