
// src/app/(app)/wifi-bills/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { WifiBill } from '@/types'; // Assuming WifiBill type is defined

const WifiBillFormSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required." }),
  wifiProvider: z.string().min(1, { message: "WiFi provider is required." }),
  planName: z.string().min(1, { message: "Plan name is required." }),
  accountNumber: z.string().optional().or(z.literal('')),
  paymentCycle: z.enum(["Monthly", "2 Months", "Quarterly", "Annually"], {
    required_error: "Payment cycle is required.",
  }),
  billAmount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ invalid_type_error: "Bill amount must be a number." })
     .min(0, { message: "Bill amount cannot be negative." })
  ),
  currency: z.enum(["MMK", "USD"], {
    required_error: "Currency is required.",
  }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Due date is required and must be a valid date.",
  }),
  paymentDate: z.string().optional().nullable().refine(
    (date) => date === null || date === undefined || date === '' || !isNaN(Date.parse(date)), {
    message: "Payment date must be a valid date if provided.",
  }).transform(val => val === '' ? null : val), // Ensure empty string becomes null
  status: z.enum(["Pending", "Paid", "Overdue", "Cancelled"], {
    required_error: "Status is required.",
  }),
  invoiceUrl: z.string().url({ message: "Invalid URL format for invoice." }).optional().or(z.literal('')),
  notes: z.string().max(500, { message: "Notes cannot exceed 500 characters." }).optional().or(z.literal('')),
});

export type AddWifiBillFormState = {
  message: string | null;
  errors?: {
    companyName?: string[];
    wifiProvider?: string[];
    planName?: string[];
    accountNumber?: string[];
    paymentCycle?: string[];
    billAmount?: string[];
    currency?: string[];
    dueDate?: string[];
    paymentDate?: string[];
    status?: string[];
    invoiceUrl?: string[];
    notes?: string[];
    _form?: string[];
  };
  success?: boolean;
  newWifiBillId?: string;
};

export async function addWifiBill(
  prevState: AddWifiBillFormState | undefined,
  formData: FormData
): Promise<AddWifiBillFormState> {
  const rawFormData = {
    companyName: formData.get('companyName'),
    wifiProvider: formData.get('wifiProvider'),
    planName: formData.get('planName'),
    accountNumber: formData.get('accountNumber'),
    paymentCycle: formData.get('paymentCycle'),
    billAmount: formData.get('billAmount'),
    currency: formData.get('currency'),
    dueDate: formData.get('dueDate'),
    paymentDate: formData.get('paymentDate'),
    status: formData.get('status'),
    invoiceUrl: formData.get('invoiceUrl'),
    notes: formData.get('notes'),
  };

  const validatedFields = WifiBillFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("WiFi Bill Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const data = validatedFields.data;

  try {
    const wifiBillsCollectionRef = collection(db, 'wifiBills');
    
    const billToSave: Omit<WifiBill, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any } = {
        companyName: data.companyName,
        wifiProvider: data.wifiProvider,
        planName: data.planName,
        accountNumber: data.accountNumber || undefined,
        paymentCycle: data.paymentCycle,
        billAmount: data.billAmount,
        currency: data.currency,
        dueDate: data.dueDate, // Firestore will store as string if it is a string
        paymentDate: data.paymentDate || undefined, // Store as string or undefined
        status: data.status,
        invoiceUrl: data.invoiceUrl || undefined,
        notes: data.notes || undefined,
        createdAt: serverTimestamp(), // Firestore server timestamp
    };

    const docRef = await addDoc(wifiBillsCollectionRef, billToSave);
    console.log("New WiFi bill added to Firestore with ID:", docRef.id);

    revalidatePath('/wifi-bills');

    return {
      message: `WiFi bill for ${data.companyName} (${data.planName}) added successfully.`,
      success: true,
      newWifiBillId: docRef.id,
    };
  } catch (error) {
    console.error("Error adding WiFi bill to Firestore:", error);
    let errorMessage = "An unexpected error occurred while adding the WiFi bill.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Adding WiFi bill failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}

const DeleteWifiBillSchema = z.object({
  billId: z.string().min(1, { message: "Bill ID is required." }),
});

export type DeleteWifiBillFormState = {
  message: string | null;
  errors?: {
    billId?: string[];
    _form?: string[];
  };
  success?: boolean;
  deletedBillId?: string;
};

export async function deleteWifiBill(
  prevState: DeleteWifiBillFormState | undefined,
  formData: FormData
): Promise<DeleteWifiBillFormState> {
  const validatedFields = DeleteWifiBillSchema.safeParse({
    billId: formData.get('billId'),
  });

  if (!validatedFields.success) {
    console.error("WiFi Bill Deletion Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Bill ID is required.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { billId } = validatedFields.data;

  try {
    const billDocRef = doc(db, 'wifiBills', billId);
    await deleteDoc(billDocRef);
    console.log("WiFi bill deleted from Firestore with ID:", billId);

    revalidatePath('/wifi-bills');

    return {
      message: `WiFi bill (ID: ${billId}) deleted successfully.`,
      success: true,
      deletedBillId: billId,
    };
  } catch (error) {
    console.error("Error deleting WiFi bill from Firestore:", error);
    let errorMessage = "An unexpected error occurred while deleting the WiFi bill.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Deleting WiFi bill failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
