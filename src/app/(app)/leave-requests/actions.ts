
'use server';

import { z } from 'zod';
import type { LeaveRequest } from '@/types';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

const LeaveRequestFormSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee is required." }),
  leaveType: z.enum(["ကြိုတင်ခွင့်", "အလုပ်နောက်ကျ", "ခွင့်(နေမကောင်း)", "ခွင့်ရက်ရှည်", "ခွင့်မဲ့ပျက်", "အပြစ်ပေး (ဖိုင်း)"], {
    required_error: "Leave type is required.",
  }),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Start date is required and must be valid." }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "End date is required and must be valid." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }).max(500, { message: "Reason cannot exceed 500 characters." }),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date cannot be before start date.",
  path: ["endDate"], 
});

export type SubmitLeaveRequestFormState = {
  message: string | null;
  errors?: {
    employeeId?: string[];
    leaveType?: string[];
    startDate?: string[];
    endDate?: string[];
    reason?: string[];
    _form?: string[];
  };
  success?: boolean;
  newLeaveRequestId?: string; 
};

export async function submitLeaveRequest(
  prevState: SubmitLeaveRequestFormState | undefined,
  formData: FormData
): Promise<SubmitLeaveRequestFormState> {
  const employeeName = formData.get('employeeName') as string || 'Unknown Employee'; 

  const validatedFields = LeaveRequestFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    leaveType: formData.get('leaveType'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    reason: formData.get('reason'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const newLeaveRequestData = validatedFields.data;

  try {
    const leaveRequestsCollectionRef = collection(db, "leaveRequests");
    const docRef = await addDoc(leaveRequestsCollectionRef, {
      employeeId: newLeaveRequestData.employeeId,
      employeeName: employeeName,
      leaveType: newLeaveRequestData.leaveType,
      startDate: newLeaveRequestData.startDate,
      endDate: newLeaveRequestData.endDate,
      reason: newLeaveRequestData.reason,
      status: "Pending",
      requestedDate: Timestamp.fromDate(new Date()), // Store as Firestore Timestamp
    });
    
    console.log("New leave request submitted to Firestore with ID:", docRef.id);
    
    revalidatePath('/leave-requests'); 

    return {
      message: `Leave request for ${employeeName} submitted successfully.`,
      success: true,
      newLeaveRequestId: docRef.id,
    };
  } catch (error) {
    console.error("Error submitting leave request to Firestore:", error);
    let errorMessage = "An unexpected error occurred while submitting the leave request.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Submitting leave request failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}


export type UpdateLeaveStatusFormState = {
  message: string | null;
  success?: boolean;
  updatedRequestId?: string;
  newStatus?: "Approved" | "Rejected";
};

export async function updateLeaveRequestStatus(
  requestId: string,
  newStatus: "Approved" | "Rejected",
  rejectionReason?: string
): Promise<UpdateLeaveStatusFormState> {
  console.log(`Updating leave request ${requestId} to ${newStatus} in Firestore.`);
  
  try {
    const leaveRequestDocRef = doc(db, "leaveRequests", requestId);
    const dataToUpdate: { status: string; processedDate: Timestamp; rejectionReason?: string } = {
      status: newStatus,
      processedDate: Timestamp.fromDate(new Date()),
    };

    if (newStatus === "Rejected" && rejectionReason) {
      dataToUpdate.rejectionReason = rejectionReason;
      console.log(`Rejection reason: ${rejectionReason}`);
    }

    await updateDoc(leaveRequestDocRef, dataToUpdate);
    
    revalidatePath('/leave-requests');

    return {
      message: `Leave request ${requestId} has been ${newStatus.toLowerCase()}.`,
      success: true,
      updatedRequestId: requestId,
      newStatus: newStatus,
    };
  } catch (error) {
    console.error("Error updating leave request status in Firestore:", error);
    let errorMessage = "An unexpected error occurred while updating leave request status.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Updating leave request status failed: ${errorMessage}`,
      success: false,
    };
  }
}
