// src/app/(app)/dashboard/new_employee/addPost.tsx
'use client';

import { useEffect, useActionState, startTransition, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import Image from 'next/image';

import { addEmployee, type AddEmployeeFormState } from '@/app/(app)/employees/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// This is essentially a copy of the AddEmployeeForm for this specific route.
// In a larger refactor, this could be a shared component.

const ClientEmployeeSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  company: z.string().min(1, { message: "Company is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  role: z.string().min(1, { message: "Role is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  status: z.enum(["Active", "Inactive"],{ required_error: "Status is required." }),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], { required_error: "Gender is required." }),
  avatarFile: (typeof window !== 'undefined' ? z.instanceof(FileList) : z.any())
    .optional()
    .refine(files => !files || files.length <= 1, { message: "Only one avatar image can be uploaded." })
    .refine(files => !files || files.length === 0 || (files[0]?.size <= 2 * 1024 * 1024), { message: "Avatar image size must be 2MB or less." })
    .refine(files => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(files[0]?.type), { message: "Invalid file type." })
    .transform(fileList => (fileList && fileList.length > 0 ? fileList[0] : undefined)),
  salary: z.string().optional().refine(val => val === undefined || val === "" || !isNaN(parseFloat(val)), {
    message: "Salary must be a number or empty.",
  }),
});

type EmployeeFormData = z.infer<typeof ClientEmployeeSchema>;

interface AddNewEmployeeFormProps {
  onFormSubmissionSuccess?: (newEmployeeId?: string) => void;
  uniqueDepartments: string[];
  uniqueRoles: string[];
  uniqueCompanies: string[];
  className?: string;
}

function SubmitButton({ isImageUploading }: { isImageUploading: boolean }) {
  const { pending: isActionPending } = useFormStatus();
  const isDisabled = isImageUploading || isActionPending;

  let buttonText = "Add New Employee";
  if (isImageUploading) buttonText = "Uploading Image...";
  else if (isActionPending) buttonText = "Saving Employee...";

  return (
    <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
      {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
}

export function AddNewEmployeeForm({ onFormSubmissionSuccess, uniqueDepartments, uniqueRoles, uniqueCompanies, className }: AddNewEmployeeFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addEmployee, { message: null, errors: {}, success: false });
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(ClientEmployeeSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      company: '',
      department: 'Software Development', // Default for this page
      role: '',
      email: '',
      phone: '',
      startDate: undefined,
      status: 'Active',
      gender: 'Prefer not to say',
      avatarFile: undefined,
      salary: '',
    },
  });

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      form.setValue('avatarFile', files, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      form.setValue('avatarFile', undefined, { shouldValidate: true });
      setAvatarPreview(null);
    }
  };

  useEffect(() => {
    if (state?.success && state.message) {
      toast({ title: "Success", description: state.message });
      form.reset();
      setAvatarPreview(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
      if (onFormSubmissionSuccess) onFormSubmissionSuccess(state.newEmployeeId);
    } else if (!state?.success && state.message) {
       toast({
        title: "Error Adding Employee",
        description: state.errors?._form?.[0] || state.message,
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);

  const onSubmit = async (data: EmployeeFormData) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        const value = data[key as keyof EmployeeFormData];
        if (key === 'startDate' && value instanceof Date) {
            formData.append(key, format(value, "yyyy-MM-dd"));
        } else if (key !== 'avatarFile' && value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });

    let avatarUrl = '';
    const fileToUpload = data.avatarFile;

    if (fileToUpload) {
      setIsImageUploading(true);
      try {
        const sRef = storageRef(storage, `employee-avatars/${Date.now()}-${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(sRef, fileToUpload);
        await uploadTask;
        avatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
      } catch (error) {
        toast({ title: "Avatar Upload Failed", variant: "destructive" });
      } finally {
        setIsImageUploading(false);
      }
    }
    
    formData.append('avatar', avatarUrl);

    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor="name-add">Full Name</Label>
        <Input id="name-add" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
      </div>

       <div>
        <Label htmlFor="employeeId-add">Employee ID</Label>
        <Input id="employeeId-add" {...form.register('employeeId')} />
        {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="department-add">Department</Label>
            <Controller
                control={form.control}
                name="department"
                render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue="Software Development">
                    <SelectTrigger id="department-add"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    {["Software Development", "Engineering", "IT", ...uniqueDepartments.filter(d => !["Software Development", "Engineering", "IT"].includes(d))].map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                    </SelectContent>
                </Select>
                )}
            />
            {form.formState.errors.department && <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>}
        </div>
        <div>
            <Label htmlFor="role-add">Role</Label>
            <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                    <SelectTrigger id="role-add"><SelectValue placeholder="Select Role"/></SelectTrigger>
                    <SelectContent>
                    {["Frontend Developer", "Backend Developer", "Full Stack Developer", "UI/UX Designer", ...uniqueRoles.filter(r => !["Frontend Developer", "Backend Developer", "Full Stack Developer", "UI/UX Designer"].includes(r))].map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                    </SelectContent>
                </Select>
                )}
            />
            {form.formState.errors.role && <p className="text-sm text-destructive mt-1">{form.formState.errors.role.message}</p>}
        </div>
      </div>
      {/* Add more fields as needed, copying from add-employee-form.tsx */}
      <div className="flex justify-end pt-2">
        <SubmitButton isImageUploading={isImageUploading} />
      </div>
    </form>
  );
}
