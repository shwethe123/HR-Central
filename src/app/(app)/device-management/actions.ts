// src/app/(app)/device-management/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Schema for a single credential
const CredentialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Credential name is required." }),
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().optional().or(z.literal('')),
});

const DeviceFormSchema = z.object({
  company: z.string().min(1, { message: "Company is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Purchase date is required." }),
  issueDate: z.string().optional(),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().max(1000).optional().or(z.literal('')),
  credentials: z.array(CredentialSchema).optional(),
}).refine(data => {
    if (data.status !== 'Active') {
        return data.issueDate && data.issueDate.length > 0 && !isNaN(Date.parse(data.issueDate));
    }
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

// Helper to parse FormData into a structured object for validation
const parseFormData = (formData: FormData) => {
    const rawData: any = {
        credentials: [],
    };
    const credentialMap: { [key: string]: any } = {};

    for (const [key, value] of formData.entries()) {
        const credentialMatch = key.match(/^credentials\[(\d+)\]\.(.+)$/);
        if (credentialMatch) {
            const index = credentialMatch[1];
            const field = credentialMatch[2];
            if (!credentialMap[index]) {
                credentialMap[index] = { id: index };
            }
            credentialMap[index][field] = value;
        } else {
            rawData[key] = value;
        }
    }
    rawData.credentials = Object.values(credentialMap);
    return rawData;
};


// Action to add a new device
export async function addDevice(prevState: DeviceFormState, formData: FormData): Promise<DeviceFormState> {
  const rawData = parseFormData(formData);
  const validatedFields = DeviceFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    // console.log("Validation Errors:", validatedFields.error.flatten());
    return {
      message: "Validation failed. Please check form fields.",
      // @ts-ignore
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const data = validatedFields.data;

  try {
    const dataToSave = {
        ...data,
        issueDate: data.status === 'Active' ? '' : data.issueDate,
        credentials: data.credentials || [], // Ensure credentials is an array
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

  const rawData = parseFormData(formData);
  const validatedFields = DeviceFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    // console.log("Update Validation Errors:", validatedFields.error.flatten());
    return {
      message: "Validation failed. Please check form fields.",
      // @ts-ignore
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
      credentials: data.credentials || [],
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
