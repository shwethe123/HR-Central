// src/app/(app)/cleaning-schedule/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { CleaningSchedule, CleaningStatus } from '@/types';

const UpdateCleaningStatusSchema = z.object({
  scheduleId: z.string().min(1, { message: "Schedule ID (date) is required." }),
  employeeId: z.string().min(1, { message: "Employee ID is required." }),
  newStatus: z.enum(['Pending', 'Completed', 'Verified']),
});

export type UpdateCleaningStatusState = {
  message: string;
  success: boolean;
  employeeName?: string;
};

export async function updateCleaningStatus(
  scheduleId: string,
  employeeId: string,
  newStatus: CleaningStatus
): Promise<UpdateCleaningStatusState> {
  const validatedFields = UpdateCleaningStatusSchema.safeParse({
    scheduleId,
    employeeId,
    newStatus,
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
        return { ...assignment, status: newStatus };
      }
      return assignment;
    });

    await updateDoc(scheduleDocRef, {
      assignments: updatedAssignments,
    });
    
    revalidatePath('/cleaning-schedule');

    return {
      message: `Status for ${employeeName} updated to ${newStatus}.`,
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

const UpdateCleaningAssignmentSchema = z.object({
  scheduleId: z.string().min(1),
  employeeId: z.string().min(1),
  newAssignedRow: z.string().min(1),
});

export async function updateCleaningAssignment(
  scheduleId: string,
  employeeId: string,
  newAssignedRow: string
): Promise<UpdateCleaningStatusState> {
  const validatedFields = UpdateCleaningAssignmentSchema.safeParse({
    scheduleId,
    employeeId,
    newAssignedRow,
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed for assignment update.",
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
        employeeName = assignment.employeeName;
        return { ...assignment, assignedRow: newAssignedRow, status: 'Pending' as CleaningStatus }; // Reset status on new assignment
      }
      return assignment;
    });

    await updateDoc(scheduleDocRef, {
      assignments: updatedAssignments,
    });
    
    revalidatePath('/cleaning-schedule');

    return {
      message: `Task for ${employeeName} reassigned to ${newAssignedRow}.`,
      success: true,
    };

  } catch (error) {
    console.error("Error updating cleaning assignment:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return {
      message: `Failed to reassign task: ${errorMessage}`,
      success: false,
    };
  }
}
