// src/app/(app)/developer-attendance/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
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

const DeleteDeveloperLeaveSchema = z.object({
  attendanceId: z.string().min(1, { message: "Attendance ID is required to delete." }),
});

export type DeleteDeveloperLeaveState = {
  message: string | null;
  success: boolean;
};

export async function deleteDeveloperLeave(
  attendanceId: string
): Promise<DeleteDeveloperLeaveState> {
  const validatedFields = DeleteDeveloperLeaveSchema.safeParse({ attendanceId });

  if (!validatedFields.success) {
    return {
      message: "Invalid Attendance ID provided.",
      success: false,
    };
  }
  
  try {
    const leaveDocRef = doc(db, 'developerAttendances', attendanceId);
    await deleteDoc(leaveDocRef);

    revalidatePath('/developer-attendance');

    return {
      message: 'Leave record has been successfully removed.',
      success: true,
    };
  } catch (error) {
    console.error(`Error deleting leave record (ID: ${attendanceId}):`, error);
     return {
      message: error instanceof Error ? error.message : 'An unknown server error occurred while deleting.',
      success: false,
    };
  }
}

// New action for adding a public holiday
const AddPublicHolidaySchema = z.object({
  name: z.string().min(2, { message: "Holiday name is required (min 2 chars)." }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "A valid date is required." }),
});

export type AddPublicHolidayState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof AddPublicHolidaySchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

export async function addPublicHoliday(
  prevState: AddPublicHolidayState,
  formData: FormData
): Promise<AddPublicHolidayState> {
  const validatedFields = AddPublicHolidaySchema.safeParse({
    name: formData.get('name'),
    date: formData.get('date'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  try {
    await addDoc(collection(db, 'publicHolidays'), {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    });

    revalidatePath('/developer-attendance');
    
    return {
      message: `${validatedFields.data.name} on ${validatedFields.data.date} added as a public holiday.`,
      success: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Failed to add public holiday.",
      success: false,
    };
  }
}

// New action for deleting a public holiday
export async function deletePublicHoliday(holidayId: string): Promise<{ success: boolean; message: string; }> {
  if (!holidayId) {
    return { success: false, message: "Holiday ID is required." };
  }

  try {
    await deleteDoc(doc(db, 'publicHolidays', holidayId));
    revalidatePath('/developer-attendance');
    return { success: true, message: "Public holiday deleted." };
  } catch (error) {
    console.error(`Error deleting public holiday (ID: ${holidayId}):`, error);
    return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to delete public holiday." 
    };
  }
}
