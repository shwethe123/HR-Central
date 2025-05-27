
'use server';

import { z } from 'zod';
import type { Employee } from '@/types';
import { revalidatePath } from 'next/cache';

// For now, we'll just log the employee data as there's no database.
// In a real app, you'd save this to a database.
// let mockEmployeeStore: Employee[] = []; // This won't persist reliably

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
  avatar: z.string().url({ message: "Invalid URL for avatar." }).optional().or(z.literal('')),
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
    _form?: string[];
  };
  success?: boolean;
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
    const newEmployee: Employee = {
      id: `EMP${Date.now()}${Math.random().toString(16).slice(2,6)}`, 
      ...newEmployeeData,
      phone: newEmployeeData.phone || '', 
      avatar: newEmployeeData.avatar || '', 
      company: newEmployeeData.company,
      startDate: newEmployeeData.startDate, 
    };
    console.log("New employee added (simulated):", newEmployee);
    
    revalidatePath('/employees'); 

    return {
      message: `Employee "${newEmployee.name}" added successfully (simulated). The list won't update due to the current hardcoded data setup.`,
      success: true,
    };
  } catch (error) {
    console.error("Error adding employee:", error);
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
