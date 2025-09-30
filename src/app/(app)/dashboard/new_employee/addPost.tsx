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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const ClientEmployeeSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  github: z.string().min(1, { message: "GitHub username is required." }),
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
  workLocation: z.enum(["On-site", "Remote", "Hybrid"], { required_error: "Work location is required." }),
  paymentInfo: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof ClientEmployeeSchema>;

interface AddNewEmployeeFormProps {
  onFormSubmissionSuccess?: (newEmployeeId?: string) => void;
  className?: string;
}

function SubmitButton({ isImageUploading }: { isImageUploading: boolean }) {
  const { pending: isActionPending } = useFormStatus();
  const isDisabled = isImageUploading || isActionPending;

  let buttonText = "Add New Developer";
  if (isImageUploading) buttonText = "Uploading Image...";
  else if (isActionPending) buttonText = "Saving Developer...";

  return (
    <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
      {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
}

export function AddNewEmployeeForm({ onFormSubmissionSuccess, className }: AddNewEmployeeFormProps) {
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
      github: '',
      phone: '',
      startDate: undefined,
      status: 'Active',
      gender: 'Prefer not to say',
      avatarFile: undefined,
      salary: '',
      workLocation: 'On-site',
      paymentInfo: '',
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
    // Set default values for fields removed from this specific form
    formData.append('company', 'Default Company'); // Or a relevant default
    formData.append('department', 'Software Development');
    formData.append('role', 'Developer');
    
    // Add other form data
    Object.keys(data).forEach(key => {
        const value = data[key as keyof EmployeeFormData];
        if (key === 'startDate' && value instanceof Date) {
            formData.append(key, format(value, "yyyy-MM-dd"));
        } else if (key === 'github' && typeof value === 'string') {
            formData.append(key, value);
            // Create a fake email from github username for auth compatibility if needed
            formData.append('email', `${value}@github.com`);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
            <Label htmlFor="github-add">GitHub Username</Label>
            <Input id="github-add" {...form.register('github')} />
            {form.formState.errors.github && <p className="text-sm text-destructive mt-1">{form.formState.errors.github.message}</p>}
        </div>
        <div>
            <Label htmlFor="phone-add">Phone Number (Optional)</Label>
            <Input id="phone-add" type="tel" {...form.register('phone')} />
            {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate-add">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <input
                type="date"
                id="startDate-add"
                className="w-full border rounded px-3 py-2 text-sm"
                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              />
            )}
          />
          {form.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="salary-add">Salary (Per Month)</Label>
          <Input id="salary-add" type="text" {...form.register('salary')} placeholder="e.g., 75000" inputMode="numeric" />
          {form.formState.errors.salary && <p className="text-sm text-destructive mt-1">{form.formState.errors.salary.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="paymentInfo-add">Bank/KPay Account (Optional)</Label>
        <Input id="paymentInfo-add" {...form.register('paymentInfo')} placeholder="e.g., KBZ - 123456789 or KPay - 09..."/>
        {form.formState.errors.paymentInfo && <p className="text-sm text-destructive mt-1">{form.formState.errors.paymentInfo.message}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status-add">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <select {...field} id="status-add" className="w-full border rounded px-3 py-2 text-sm">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="gender-add">Gender</Label>
           <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <select {...field} id="gender-add" className="w-full border rounded px-3 py-2 text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="workLocation-add">Work Location</Label>
           <Controller
            control={form.control}
            name="workLocation"
            render={({ field }) => (
              <select {...field} id="workLocation-add" className="w-full border rounded px-3 py-2 text-sm">
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            )}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="avatar-add">Avatar Image (Optional, Max 2MB)</Label>
        <Input
          id="avatar-add"
          type="file"
          accept="image/*"
          ref={avatarFileInputRef}
          onChange={handleAvatarFileChange}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        {form.formState.errors.avatarFile && <p className="text-sm text-destructive mt-1">{form.formState.errors.avatarFile.message}</p>}
        {avatarPreview && (
          <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
            <Image src={avatarPreview} alt="Avatar preview" width={100} height={100} className="rounded-md object-cover" data-ai-hint="upload preview person"/>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton isImageUploading={isImageUploading} />
      </div>
    </form>
  );
}
