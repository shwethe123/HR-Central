
'use server';

import { z } from 'zod';
import type { LeaveRequest } from '@/types';
import { revalidatePath } from 'next/cache';

// In a real app, this data would come from and be saved to a database.
// For now, we'll simulate updates for demonstration purposes.

const LeaveRequestFormSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee is required." }),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Start date is required and must be valid." }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "End date is required and must be valid." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }).max(500, { message: "Reason cannot exceed 500 characters." }),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "End date cannot be before start date.",
  path: ["endDate"], // Field to blame for the error
});

export type SubmitLeaveRequestFormState = {
  message: string | null;
  errors?: {
    employeeId?: string[];
    startDate?: string[];
    endDate?: string[];
    reason?: string[];
    _form?: string[];
  };
  success?: boolean;
  newLeaveRequest?: LeaveRequest; // To send back the created request if needed
};

export async function submitLeaveRequest(
  prevState: SubmitLeaveRequestFormState | undefined,
  formData: FormData
): Promise<SubmitLeaveRequestFormState> {
  const employeeName = formData.get('employeeName') as string || 'Unknown Employee'; // Get employeeName for the new request object

  const validatedFields = LeaveRequestFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
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
    const newRequest: LeaveRequest = {
      id: `LR${Date.now()}${Math.random().toString(16).slice(2, 8)}`,
      employeeId: newLeaveRequestData.employeeId,
      employeeName: employeeName, 
      startDate: newLeaveRequestData.startDate,
      endDate: newLeaveRequestData.endDate,
      reason: newLeaveRequestData.reason,
      status: "Pending",
      requestedDate: new Date().toISOString().split('T')[0], // Current date
    };
    console.log("New leave request submitted (simulated):", newRequest);
    
    revalidatePath('/leave-requests'); 

    return {
      message: `Leave request for ${newRequest.employeeName} submitted successfully (simulated).`,
      success: true,
      newLeaveRequest: newRequest, // Pass back the created object
    };
  } catch (error) {
    console.error("Error submitting leave request:", error);
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
  console.log(`Updating leave request ${requestId} to ${newStatus} (simulated).`);
  if (newStatus === "Rejected" && rejectionReason) {
    console.log(`Rejection reason: ${rejectionReason}`);
  }

  // In a real app, you would find the request in the database and update its status.
  // For this simulation, we'll just return a success message.
  
  revalidatePath('/leave-requests');

  return {
    message: `Leave request ${requestId} has been ${newStatus.toLowerCase()} (simulated).`,
    success: true,
    updatedRequestId: requestId,
    newStatus: newStatus,
  };
}
