
'use server';

import { z } from 'zod';
import type { Employee } from '@/types';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'; // Added updateDoc

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
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], { required_error: "Gender is required." }),
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
    gender?: string[];
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
    gender: formData.get('gender'),
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
  console.log("Attempting to add employee to Firestore with data:", newEmployeeData);

  try {
    const employeesCollectionRef = collection(db, "employees");
    
    const employeeToSave: Omit<Employee, 'id'> = {
        name: newEmployeeData.name,
        employeeId: newEmployeeData.employeeId,
        company: newEmployeeData.company,
        department: newEmployeeData.department,
        role: newEmployeeData.role,
        email: newEmployeeData.email,
        phone: newEmployeeData.phone || '', 
        startDate: newEmployeeData.startDate,
        status: newEmployeeData.status,
        gender: newEmployeeData.gender,
        avatar: newEmployeeData.avatar || '', 
        salary: newEmployeeData.salary, 
    };

    const docRef = await addDoc(employeesCollectionRef, employeeToSave);
    console.log("New employee added to Firestore with ID:", docRef.id);
    
    revalidatePath('/employees'); 

    return {
      message: `Employee "${newEmployeeData.name}" added successfully to Firestore.`,
      success: true,
      newEmployeeId: docRef.id,
    };
  } catch (error: any) {
    console.error("Error adding employee to Firestore:", error);
    let errorMessage = "An unexpected error occurred while adding the employee.";
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error && (error as any).code === 'permission-denied') {
        errorMessage = `Firestore Permission Denied: ${error.message}. Please check your Firestore Security Rules.`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return {
      message: `Adding employee failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}

const DeleteEmployeeSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee ID is required." }),
});

export type DeleteEmployeeFormState = {
  message: string | null;
  errors?: {
    employeeId?: string[];
    _form?: string[];
  };
  success?: boolean;
  deletedEmployeeId?: string;
};

export async function deleteEmployee(
  prevState: DeleteEmployeeFormState | undefined,
  formData: FormData
): Promise<DeleteEmployeeFormState> {
  const validatedFields = DeleteEmployeeSchema.safeParse({
    employeeId: formData.get('employeeId'),
  });

  if (!validatedFields.success) {
    console.error("Validation failed for deleteEmployee:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Employee ID is required.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { employeeId } = validatedFields.data;
  const employeeDocRef = doc(db, "employees", employeeId);

  try {
    await deleteDoc(employeeDocRef);
    console.log(`Employee with ID: ${employeeId} successfully deleted from Firestore.`);
    
    revalidatePath('/employees');

    return {
      message: `Employee (ID: ${employeeId}) deleted successfully.`,
      success: true,
      deletedEmployeeId: employeeId,
    };
  } catch (error) {
    console.error(`Error deleting employee with ID ${employeeId} from Firestore:`, error);
    let errorMessage = "An unexpected error occurred while deleting the employee.";
    if (error instanceof Error) {
      errorMessage = error.message;
       if ('code' in error && (error as any).code === 'permission-denied') {
        errorMessage = `Firestore Permission Denied: ${error.message}. Please check your Firestore Security Rules for deleting documents in the 'employees' collection.`;
      }
    }
    return {
      message: `Deleting employee (ID: ${employeeId}) failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}

// Schema for updating an employee - reuses EmployeeFormSchema and adds document ID
const UpdateEmployeeFormSchema = EmployeeFormSchema.extend({
  id: z.string().min(1, { message: "Document ID is required for update." }),
});

export type UpdateEmployeeFormState = {
  message: string | null;
  errors?: {
    id?: string[]; // For errors related to the document ID itself
    name?: string[];
    employeeId?: string[];
    company?: string[];
    department?: string[];
    role?: string[];
    email?: string[];
    phone?: string[];
    startDate?: string[];
    status?: string[];
    gender?: string[];
    avatar?: string[];
    salary?: string[];
    _form?: string[];
  };
  success?: boolean;
  updatedEmployeeId?: string; // Firestore document ID
};

export async function updateEmployee(
  prevState: UpdateEmployeeFormState | undefined,
  formData: FormData
): Promise<UpdateEmployeeFormState> {
  const employeeDocumentId = formData.get('id') as string;

  const validatedFields = EmployeeFormSchema.safeParse({ // Use EmployeeFormSchema for data fields
    name: formData.get('name'),
    employeeId: formData.get('employeeId'),
    company: formData.get('company'),
    department: formData.get('department'),
    role: formData.get('role'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    startDate: formData.get('startDate'),
    status: formData.get('status'),
    gender: formData.get('gender'),
    avatar: formData.get('avatar') || undefined,
    salary: formData.get('salary') || undefined,
  });

  if (!employeeDocumentId) {
    return {
      message: "Employee document ID is missing.",
      errors: { _form: ["Employee document ID is required for update."] },
      success: false,
    };
  }

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check employee data.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const employeeDataToUpdate = validatedFields.data;
  console.log(`Attempting to update employee (Doc ID: ${employeeDocumentId}) in Firestore with data:`, employeeDataToUpdate);

  try {
    const employeeDocRef = doc(db, "employees", employeeDocumentId);
    
    // Prepare data for Firestore, ensuring correct types and handling optionals
    const dataForFirestore: Partial<Employee> = {
      name: employeeDataToUpdate.name,
      employeeId: employeeDataToUpdate.employeeId,
      company: employeeDataToUpdate.company,
      department: employeeDataToUpdate.department,
      role: employeeDataToUpdate.role,
      email: employeeDataToUpdate.email,
      phone: employeeDataToUpdate.phone || '',
      startDate: employeeDataToUpdate.startDate,
      status: employeeDataToUpdate.status,
      gender: employeeDataToUpdate.gender,
      // Only include avatar and salary if they have a value.
      // If avatar is an empty string from form and you want to remove it, handle accordingly.
      // For now, if it's undefined/empty string, it might not be sent or sent as empty.
      ...(employeeDataToUpdate.avatar && { avatar: employeeDataToUpdate.avatar }),
      ...(employeeDataToUpdate.salary !== undefined && { salary: employeeDataToUpdate.salary }),
    };

    await updateDoc(employeeDocRef, dataForFirestore);
    console.log(`Employee (Doc ID: ${employeeDocumentId}) updated successfully in Firestore.`);
    
    revalidatePath('/employees'); 

    return {
      message: `Employee "${employeeDataToUpdate.name}" (Doc ID: ${employeeDocumentId}) updated successfully.`,
      success: true,
      updatedEmployeeId: employeeDocumentId,
    };
  } catch (error: any) {
    console.error(`Error updating employee (Doc ID: ${employeeDocumentId}) in Firestore:`, error);
    let errorMessage = "An unexpected error occurred while updating the employee.";
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error && (error as any).code === 'permission-denied') {
        errorMessage = `Firestore Permission Denied: ${error.message}. Check rules for 'employees' collection.`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return {
      message: `Updating employee (Doc ID: ${employeeDocumentId}) failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
