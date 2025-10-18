// src/app/(app)/device-management/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

const DeviceFormSchema = z.object({
  company: z.string().min(1, { message: "Company is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Purchase date is required." }),
  issueDate: z.string().optional(),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().max(1000).optional().or(z.literal('')),
}).refine(data => {
    // If status is not 'Active', issueDate must be provided and valid.
    if (data.status !== 'Active') {
        return data.issueDate && data.issueDate.length > 0 && !isNaN(Date.parse(data.issueDate));
    }
    // If status is 'Active', issueDate is not required.
    return true;
}, {
    message: "Issue date is required when status is not 'Active'.",
    path: ['issueDate'],
});


export type DeviceFormState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof DeviceFormSchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

// Action to add a new device
export async function addDevice(prevState: DeviceFormState, formData: FormData): Promise<DeviceFormState> {
  const validatedFields = DeviceFormSchema.safeParse({
    company: formData.get('company'),
    department: formData.get('department'),
    phoneModel: formData.get('phoneModel'),
    imei: formData.get('imei'),
    purchaseDate: formData.get('purchaseDate'),
    issueDate: formData.get('issueDate') || undefined,
    status: formData.get('status'),
    notes: formData.get('notes'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check form fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const data = validatedFields.data;

  try {
    const dataToSave = {
        ...data,
        issueDate: data.status === 'Active' ? '' : data.issueDate, // Clear issue date if status is active
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'smartphones'), dataToSave);

    revalidatePath('/device-management');
    return { message: `Device (${data.phoneModel}) has been successfully added for ${data.department}.`, success: true };

  } catch (error) {
    return { message: `Failed to add device: ${error instanceof Error ? error.message : 'Unknown error'}`, success: false };
  }
}

// Action to update an existing device
export async function updateDevice(prevState: DeviceFormState, formData: FormData): Promise<DeviceFormState> {
  const deviceId = formData.get('id') as string;
  if (!deviceId) {
    return { message: "Device ID is missing.", success: false };
  }

  const validatedFields = DeviceFormSchema.safeParse({
    company: formData.get('company'),
    department: formData.get('department'),
    phoneModel: formData.get('phoneModel'),
    imei: formData.get('imei'),
    purchaseDate: formData.get('purchaseDate'),
    issueDate: formData.get('issueDate') || undefined,
    status: formData.get('status'),
    notes: formData.get('notes'),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check form fields.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const data = validatedFields.data;

  try {
    const deviceDocRef = doc(db, 'smartphones', deviceId);
    
    const dataToUpdate = {
      ...data,
      issueDate: data.status === 'Active' ? '' : data.issueDate,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(deviceDocRef, dataToUpdate);

    revalidatePath('/device-management');
    return { message: `Device record for ${data.department} has been successfully updated.`, success: true };

  } catch (error) {
    return { message: `Failed to update device: ${error instanceof Error ? error.message : 'Unknown error'}`, success: false };
  }
}

// Action to delete a device record
export async function deleteDevice(deviceId: string): Promise<{ success: boolean; message: string; }> {
  if (!deviceId) {
    return { success: false, message: "Device ID is required for deletion." };
  }

  try {
    await deleteDoc(doc(db, 'smartphones', deviceId));
    revalidatePath('/device-management');
    return { success: true, message: "Device record deleted successfully." };
  } catch (error) {
    return { success: false, message: `Failed to delete device record: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
