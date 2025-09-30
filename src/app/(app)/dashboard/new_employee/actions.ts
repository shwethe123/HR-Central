// src/app/(app)/dashboard/new_employee/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

// Schema specific for adding a developer
const DeveloperFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  github: z.string().min(1, { message: "GitHub username is required." }),
  phone: z.string().optional().or(z.literal('')),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Start date is required and must be valid." }),
  status: z.enum(["Active", "Inactive"]),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  workLocation: z.enum(["On-site", "Remote", "Hybrid"]),
  avatar: z.string().url().optional().or(z.literal('')),
  salary: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: "Salary must be a number." }).optional()
  ),
  paymentInfo: z.string().optional().or(z.literal('')),
});

export type AddDeveloperFormState = {
  message: string | null;
  errors?: {
    name?: string[];
    employeeId?: string[];
    github?: string[];
    phone?: string[];
    startDate?: string[];
    status?: string[];
    gender?: string[];
    workLocation?: string[];
    avatar?: string[];
    salary?: string[];
    paymentInfo?: string[];
    _form?: string[];
  };
  success?: boolean;
  newDeveloperId?: string;
};

export async function addDeveloper(
  prevState: AddDeveloperFormState | undefined,
  formData: FormData
): Promise<AddDeveloperFormState> {
  const validatedFields = DeveloperFormSchema.safeParse({
    name: formData.get('name'),
    employeeId: formData.get('employeeId'),
    github: formData.get('github'),
    phone: formData.get('phone') || undefined,
    startDate: formData.get('startDate'),
    status: formData.get('status'),
    gender: formData.get('gender'),
    workLocation: formData.get('workLocation'),
    avatar: formData.get('avatar') || undefined,
    salary: formData.get('salary') || undefined,
    paymentInfo: formData.get('paymentInfo') || undefined,
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const newDeveloperData = validatedFields.data;
  console.log("Attempting to add developer to Firestore with data:", newDeveloperData);

  try {
    const developersCollectionRef = collection(db, "developers"); // Use 'developers' collection
    
    // Construct the object to save, explicitly setting developer-specific fields
    const developerToSave: Omit<Employee, 'id'> = {
        name: newDeveloperData.name,
        employeeId: newDeveloperData.employeeId,
        company: 'Default Company', // Hardcoded for developers
        department: 'Software Development', // Hardcoded for developers
        role: 'Software Developer', // Hardcoded for developers
        email: `${newDeveloperData.github}@github.com`, // Create email from github
        phone: newDeveloperData.phone || '',
        github: newDeveloperData.github,
        startDate: newDeveloperData.startDate,
        status: newDeveloperData.status,
        gender: newDeveloperData.gender,
        workLocation: newDeveloperData.workLocation,
        avatar: newDeveloperData.avatar || '',
        salary: newDeveloperData.salary,
        paymentInfo: newDeveloperData.paymentInfo || '',
    };

    const docRef = await addDoc(developersCollectionRef, developerToSave);
    console.log("New developer added to Firestore with ID:", docRef.id);
    
    revalidatePath('/dashboard/new_employee');

    return {
      message: `Developer "${newDeveloperData.name}" added successfully.`,
      success: true,
      newDeveloperId: docRef.id,
    };
  } catch (error: any) {
    console.error("Error adding developer to Firestore:", error);
    let errorMessage = "An unexpected error occurred while adding the developer.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      message: `Adding developer failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
