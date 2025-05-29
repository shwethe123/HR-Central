
'use server';

import { z } from 'zod';
import type { Employee } from '@/types';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const EmployeeFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  company: z.string().min(1, { message: "Company is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  role: z.string().min(1, { message: "Role is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().optional().or(z.literal('')),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Start date is required and must be valid." }),
  status: z.enum(["Active", "Inactive"], { required_error: "Status is required." }),
  avatar: z.string().url({ message: "Avatar must be a valid URL (e.g., https://...)" }).optional().or(z.literal('')),
  salary: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: "Salary must be a number." }).optional()
  ),
});

export type AddEmployeeFormState = {
  message: string | null;
  errors?: {
    name?: string[];
    employeeId?: string[];
    company?: string[];
    department?: string[];
    role?: string[];
    email?: string[];
    phone?: string[];
    startDate?: string[];
    status?: string[];
    avatar?: string[];
    salary?: string[];
    _form?: string[];
  };
  success?: boolean;
  newEmployeeId?: string;
};

export async function addEmployee(
  prevState: AddEmployeeFormState | undefined,
  formData: FormData
): Promise<AddEmployeeFormState> {
  const validatedFields = EmployeeFormSchema.safeParse({
    name: formData.get('name'),
    employeeId: formData.get('employeeId'),
    company: formData.get('company'),
    department: formData.get('department'),
    role: formData.get('role'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    startDate: formData.get('startDate'),
    status: formData.get('status'),
    avatar: formData.get('avatar') || undefined,
    salary: formData.get('salary') || undefined,
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const newEmployeeData = validatedFields.data;

  try {
    const employeesCollectionRef = collection(db, "employees");
    
    // Prepare data for Firestore, ensuring optional fields are handled
    const employeeToSave: Omit<Employee, 'id'> = {
        name: newEmployeeData.name,
        employeeId: newEmployeeData.employeeId,
        company: newEmployeeData.company,
        department: newEmployeeData.department,
        role: newEmployeeData.role,
        email: newEmployeeData.email,
        phone: newEmployeeData.phone || '',
        startDate: newEmployeeData.startDate, // Storing as string as per initial plan
        status: newEmployeeData.status,
        avatar: newEmployeeData.avatar || '',
        salary: newEmployeeData.salary, // Salary is already a number or undefined
    };

    const docRef = await addDoc(employeesCollectionRef, employeeToSave);
    console.log("New employee added to Firestore with ID:", docRef.id);
    
    revalidatePath('/employees'); 

    return {
      message: `Employee "${newEmployeeData.name}" added successfully to Firestore.`,
      success: true,
      newEmployeeId: docRef.id,
    };
  } catch (error) {
    console.error("Error adding employee to Firestore:", error);
    let errorMessage = "An unexpected error occurred while adding the employee.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Adding employee failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
