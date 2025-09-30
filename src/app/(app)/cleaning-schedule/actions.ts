// src/app/(app)/cleaning-schedule/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { CleaningSchedule } from '@/types';

const UpdateCleaningStatusSchema = z.object({
  scheduleId: z.string().min(1, { message: "Schedule ID (date) is required." }),
  employeeId: z.string().min(1, { message: "Employee ID is required." }),
  isCompleted: z.boolean(),
});

export type UpdateCleaningStatusState = {
  message: string;
  success: boolean;
  employeeName?: string;
};

export async function updateCleaningStatus(
  scheduleId: string,
  employeeId: string,
  isCompleted: boolean
): Promise<UpdateCleaningStatusState> {
  const validatedFields = UpdateCleaningStatusSchema.safeParse({
    scheduleId,
    employeeId,
    isCompleted,
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed: " + validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const scheduleDocRef = doc(db, 'cleaningSchedules', scheduleId);

  try {
    const scheduleDocSnap = await getDoc(scheduleDocRef);
    if (!scheduleDocSnap.exists()) {
      return { message: `Schedule for date ${scheduleId} not found.`, success: false };
    }

    const scheduleData = scheduleDocSnap.data() as CleaningSchedule;
    let employeeName = "Unknown Employee";
    
    const updatedAssignments = scheduleData.assignments.map(assignment => {
      if (assignment.employeeId === employeeId) {
        employeeName = assignment.employeeName; // Get the name for the success message
        return { ...assignment, isCompleted };
      }
      return assignment;
    });

    await updateDoc(scheduleDocRef, {
      assignments: updatedAssignments,
    });
    
    // Revalidate the path to show changes on the client
    revalidatePath('/cleaning-schedule');

    return {
      message: `Status for ${employeeName} updated successfully.`,
      success: true,
      employeeName: employeeName,
    };

  } catch (error) {
    console.error("Error updating cleaning status:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return {
      message: `Failed to update status: ${errorMessage}`,
      success: false,
    };
  }
}
