// src/app/(app)/developer-attendance/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

const AddDeveloperLeaveSchema = z.object({
  developerId: z.string().min(1, { message: "Developer must be selected." }),
  leaveDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "A valid leave date is required." }),
  reason: z.string().max(500, "Reason is too long.").optional().or(z.literal('')),
});

export type AddDeveloperLeaveState = {
  message: string;
  success: boolean;
};

export async function addDeveloperLeave(
  data: { developerId: string, leaveDate: string, reason?: string }
): Promise<AddDeveloperLeaveState> {
  const validatedFields = AddDeveloperLeaveSchema.safeParse(data);

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return {
      message: firstError || "Validation failed. Please check the form fields.",
      success: false,
    };
  }

  const { developerId, leaveDate, reason } = validatedFields.data;

  try {
    const devDocRef = doc(db, 'developers', developerId);
    const devDocSnap = await getDoc(devDocRef);

    if (!devDocSnap.exists()) {
        return { message: "Selected developer not found in the database.", success: false };
    }
    
    const developerName = (devDocSnap.data() as Employee).name || 'Unknown Developer';

    await addDoc(collection(db, 'developerAttendances'), {
      developerId,
      developerName,
      leaveDate,
      reason: reason || '',
      leaveType: 'Leave', // Standardizing the type
      status: 'Approved',   // Standardizing the status
      createdAt: serverTimestamp(),
    });

    revalidatePath('/developer-attendance');

    return {
      message: `Leave day for ${developerName} on ${leaveDate} has been recorded.`,
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
    const leaveDocSnap = await getDoc(leaveDocRef);
    if (!leaveDocSnap.exists()) {
        return { message: "Leave record not found.", success: false };
    }
    const devName = leaveDocSnap.data().developerName || "the developer";

    await deleteDoc(leaveDocRef);

    revalidatePath('/developer-attendance');

    return {
      message: `Leave day for ${devName} removed.`,
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
    const holidayDocRef = doc(db, 'publicHolidays', holidayId);
    const holidayDocSnap = await getDoc(holidayDocRef);
     if (!holidayDocSnap.exists()) {
        return { message: "Holiday record not found.", success: false };
    }
    const holidayName = holidayDocSnap.data().name || "The holiday";

    await deleteDoc(holidayDocRef);
    revalidatePath('/developer-attendance');
    return { success: true, message: `${holidayName} has been removed successfully.` };
  } catch (error) {
    console.error(`Error deleting public holiday (ID: ${holidayId}):`, error);
    return { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to delete public holiday." 
    };
  }
}
