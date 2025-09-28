// src/app/(app)/resignations/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

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
    // Get employee name for storing in the record
    const employeeDoc = await getDoc(doc(db, "employees", employeeId));
    if (!employeeDoc.exists()) {
      return { message: "Selected employee not found.", success: false };
    }
    const employeeName = (employeeDoc.data() as Employee).name;

    await addDoc(collection(db, 'resignations'), {
      employeeId,
      employeeName,
      ...data,
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
