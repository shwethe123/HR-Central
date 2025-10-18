// src/app/(app)/device-management/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

const DeviceFormSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee is required." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Purchase date is required." }),
  issueDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Issue date is required." }),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type DeviceFormState = {
  message: string | null;
  errors?: z.ZodError<z.infer<typeof DeviceFormSchema>>['formErrors']['fieldErrors'];
  success?: boolean;
};

// Action to add a new device
export async function addDevice(prevState: DeviceFormState, formData: FormData): Promise<DeviceFormState> {
  const validatedFields = DeviceFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    phoneModel: formData.get('phoneModel'),
    imei: formData.get('imei'),
    purchaseDate: formData.get('purchaseDate'),
    issueDate: formData.get('issueDate'),
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

  const { employeeId, ...data } = validatedFields.data;

  try {
    const employeeDocRef = doc(db, 'employees', employeeId);
    const employeeSnap = await getDoc(employeeDocRef);
    if (!employeeSnap.exists()) {
      return { message: "Selected employee does not exist.", success: false };
    }
    const employeeName = (employeeSnap.data() as Employee).name;

    await addDoc(collection(db, 'smartphones'), {
      ...data,
      employeeId,
      employeeName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    revalidatePath('/device-management');
    return { message: `Device (${data.phoneModel}) has been successfully added for ${employeeName}.`, success: true };

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
    employeeId: formData.get('employeeId'),
    phoneModel: formData.get('phoneModel'),
    imei: formData.get('imei'),
    purchaseDate: formData.get('purchaseDate'),
    issueDate: formData.get('issueDate'),
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
  
  const { employeeId, ...data } = validatedFields.data;

  try {
    const employeeDocRef = doc(db, 'employees', employeeId);
    const employeeSnap = await getDoc(employeeDocRef);
    if (!employeeSnap.exists()) {
      return { message: "Selected employee does not exist.", success: false };
    }
    const employeeName = (employeeSnap.data() as Employee).name;

    const deviceDocRef = doc(db, 'smartphones', deviceId);
    await updateDoc(deviceDocRef, {
      ...data,
      employeeId,
      employeeName,
      updatedAt: serverTimestamp(),
    });

    revalidatePath('/device-management');
    return { message: `Device record for ${employeeName} has been successfully updated.`, success: true };

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
