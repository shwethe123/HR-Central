
// src/app/(app)/employees/edit-employee-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isValid as isDateValid } from 'date-fns';
import NextImage from 'next/image'; // Aliased to avoid conflict

import { updateEmployee, type UpdateEmployeeFormState } from './actions';
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
import { Calendar as CalendarIcon, Loader2, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase'; // Assuming auth is not directly needed here for current user
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Employee } from '@/types';

const ClientEditEmployeeSchema = z.object({
  id: z.string().min(1, { message: "Employee ID is required for update." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  company: z.string().min(1, { message: "Company is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  role: z.string().min(1, { message: "Role is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  status: z.enum(["Active", "Inactive"]),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  avatarFile: (typeof window !== 'undefined' ? z.instanceof(FileList) : z.any())
    .optional()
    .refine(
      (fileList) => !fileList || fileList.length === 0 || fileList.length === 1,
      { message: "Only one avatar image can be uploaded." }
    )
    .refine(
      (fileList) => !fileList || fileList.length === 0 || (fileList[0]?.size <= 2 * 1024 * 1024), // Max 2MB
      { message: "Avatar image size must be 2MB or less." }
    )
    .refine(
      (fileList) => !fileList || fileList.length === 0 || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileList[0]?.type),
      { message: "Invalid file type. Only JPG, PNG, GIF, WEBP are allowed." }
    )
    .transform((fileList) => (fileList && fileList.length > 0 ? fileList[0] : undefined)),
  salary: z.string().optional().refine(val => val === undefined || val === "" || !isNaN(parseFloat(val)), {
    message: "Salary must be a number or empty.",
  }),
});

export type EditEmployeeFormData = z.infer<typeof ClientEditEmployeeSchema>;

interface EditEmployeeFormProps {
  employeeToEdit: Employee;
  onFormSubmissionSuccess?: (updatedEmployeeId?: string) => void;
  uniqueDepartments: string[];
  uniqueRoles: string[];
  uniqueCompanies: string[];
  className?: string;
}

function SubmitButton({ isImageUploading }: { isImageUploading: boolean }) {
  const { pending: isActionPending } = useFormStatus();
  const isDisabled = isImageUploading || isActionPending;

  let buttonText = "Save Changes";
  if (isImageUploading) {
    buttonText = "Uploading Image...";
  } else if (isActionPending) {
    buttonText = "Saving Changes...";
  }

  return (
    <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
      {isDisabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {buttonText}
    </Button>
  );
}

export function EditEmployeeForm({
  employeeToEdit,
  onFormSubmissionSuccess,
  uniqueDepartments,
  uniqueRoles,
  uniqueCompanies,
  className,
}: EditEmployeeFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateEmployee, { message: null, errors: {}, success: false });
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employeeToEdit.avatar || null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditEmployeeFormData>({
    resolver: zodResolver(ClientEditEmployeeSchema),
    defaultValues: {
      id: employeeToEdit.id,
      name: employeeToEdit.name || '',
      employeeId: employeeToEdit.employeeId || '',
      company: employeeToEdit.company || '',
      department: employeeToEdit.department || '',
      role: employeeToEdit.role || '',
      email: employeeToEdit.email || '',
      phone: employeeToEdit.phone || '',
      startDate: employeeToEdit.startDate && isDateValid(parseISO(employeeToEdit.startDate)) ? parseISO(employeeToEdit.startDate) : new Date(),
      status: employeeToEdit.status || 'Active',
      gender: employeeToEdit.gender || 'Prefer not to say',
      avatarFile: undefined,
      salary: employeeToEdit.salary !== undefined ? String(employeeToEdit.salary) : '',
    },
  });

  useEffect(() => {
    // Re-initialize form if employeeToEdit changes
    form.reset({
      id: employeeToEdit.id,
      name: employeeToEdit.name || '',
      employeeId: employeeToEdit.employeeId || '',
      company: employeeToEdit.company || '',
      department: employeeToEdit.department || '',
      role: employeeToEdit.role || '',
      email: employeeToEdit.email || '',
      phone: employeeToEdit.phone || '',
      startDate: employeeToEdit.startDate && isDateValid(parseISO(employeeToEdit.startDate)) ? parseISO(employeeToEdit.startDate) : new Date(),
      status: employeeToEdit.status || 'Active',
      gender: employeeToEdit.gender || 'Prefer not to say',
      avatarFile: undefined,
      salary: employeeToEdit.salary !== undefined ? String(employeeToEdit.salary) : '',
    });
    setAvatarPreview(employeeToEdit.avatar || null);
  }, [employeeToEdit, form.reset]);


  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, GIF, or WEBP image.", variant: "destructive" });
        setAvatarPreview(employeeToEdit.avatar || null); // Revert to original if invalid
        if(avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        form.setValue('avatarFile', undefined, { shouldValidate: true });
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB
        toast({ title: "File Too Large", description: "Avatar image must be 2MB or less.", variant: "destructive" });
        setAvatarPreview(employeeToEdit.avatar || null);
        if(avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        form.setValue('avatarFile', undefined, { shouldValidate: true });
        return;
      }
      form.setValue('avatarFile', files, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else { // User cleared the file input
      form.setValue('avatarFile', undefined, { shouldValidate: true });
      setAvatarPreview(employeeToEdit.avatar || null); // Show existing avatar if selection is cleared
    }
  };

  useEffect(() => {
    if (state?.success && state.message) {
      toast({ title: "Success", description: state.message });
      // Form reset is handled by useEffect for employeeToEdit or dialog close
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.updatedEmployeeId);
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
      toast({
        title: "Error Updating Employee",
        description: state.errors?._form?.[0] || state.errors?.avatar?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, onFormSubmissionSuccess]);

  const onSubmit = async (data: EditEmployeeFormData) => {
    const formData = new FormData();
    formData.append('id', data.id); // Crucial for update
    formData.append('name', data.name);
    formData.append('employeeId', data.employeeId);
    formData.append('company', data.company);
    formData.append('department', data.department);
    formData.append('role', data.role);
    formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    formData.append('startDate', format(data.startDate, "yyyy-MM-dd"));
    formData.append('status', data.status);
    formData.append('gender', data.gender);
    if (data.salary) formData.append('salary', data.salary);

    let finalAvatarUrl = employeeToEdit.avatar || '';
    const fileToUpload = data.avatarFile;

    if (fileToUpload) {
      setIsImageUploading(true);
      try {
        // Delete old avatar if it exists and is different from placeholder
        const oldAvatarUrl = employeeToEdit.avatar;
        if (oldAvatarUrl && oldAvatarUrl.includes('firebasestorage.googleapis.com')) { // Check if it's a Firebase Storage URL
            // Don't delete old one immediately, only after new one is successfully uploaded & auth profile updated.
            // This is tricky because action is separate. Best to handle old avatar deletion after successful update if possible,
            // or accept that old avatars might linger if update fails mid-way.
            // For now, we'll upload new and if successful, new URL is saved. Old one remains if this process fails.
        }

        const sRef = storageRef(storage, `employee-avatars/${data.id}-${Date.now()}-${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(sRef, fileToUpload);
        await uploadTask;
        finalAvatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
        toast({ title: "New Avatar Uploaded", description: "Image successfully uploaded." });
      } catch (error) {
        console.error("Error uploading new avatar:", error);
        toast({
          title: "Avatar Upload Failed",
          description: "Could not upload new avatar. Previous avatar (if any) will be retained.",
          variant: "destructive",
        });
        // If upload fails, we keep the original finalAvatarUrl
      } finally {
        setIsImageUploading(false);
      }
    }
    
    formData.append('avatar', finalAvatarUrl);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <input type="hidden" {...form.register('id')} />
      <div>
        <Label htmlFor="name-edit">Full Name</Label>
        <Input id="name-edit" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="employeeId-edit">Employee ID</Label>
        <Input id="employeeId-edit" {...form.register('employeeId')} />
        {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="company-edit">Company</Label>
        <Controller
          control={form.control}
          name="company"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="company-edit">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                 {[ "ဆန်ဆိုင်း", "ဝမ်လုံးဆိုင်", "ဟောင်လိတ်ဆိုင်"].map(comp => <SelectItem key={comp} value={comp}>{comp}</SelectItem>)}
                 {uniqueCompanies.filter(comp => ![ "ဆန်ဆိုင်း", "ဝမ်လုံးဆိုင်", "ဟောင်လိတ်ဆိုင်"].includes(comp)).map(comp => (
                  <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.company && <p className="text-sm text-destructive mt-1">{form.formState.errors.company.message}</p>}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department-edit">Department</Label>
          <Controller
            control={form.control}
            name="department"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="department-edit">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {["G-ထွက်", "လက်ကားပိုင်း","ကားတင်", "လက်လီပိုင်း", "ကားအော်ဒါ", "အဝင်ပိုင်း", "ပစ္စည်းမှာ", "အကြွေးကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", "ငွေကိုင်"].map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                  {uniqueDepartments.filter(dep => !["G-ထွက်", "လက်ကားပိုင်း","ကားတင်", "လက်လီပိုင်း", "ကားအော်ဒါ", "အဝင်ပိုင်း", "ပစ္စည်းမှာ", "အကြွေးကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", "ငွေကိုင်"].includes(dep)).map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.department && <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>}
        </div>

        <div>
          <Label htmlFor="role-edit">Role</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="role-edit">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                   {["ခေါင်းဆောင်","ဈေးရောင်း", "စာရင်းကိုင်", "Hစစ်", "ပစ္စည်းမှာ", "အဝင်", "ငွေကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", ].map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  {uniqueRoles.filter(role => !["ခေါင်းဆောင်","ဈေးရောင်း", "စာရင်းကိုင်", "Hစစ်", "ပစ္စည်းမှာ", "အဝင်", "ပစ္စည်းမှာ", "ငွေကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်"].includes(role)).map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.role && <p className="text-sm text-destructive mt-1">{form.formState.errors.role.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="email-edit">Email Address</Label>
        <Input id="email-edit" type="email" {...form.register('email')} />
        {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone-edit">Phone Number (Optional)</Label>
        <Input id="phone-edit" type="tel" {...form.register('phone')} />
        {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="startDate-edit">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="startDate-edit"
                    className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value && isDateValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>}
        </div>

        <div>
          <Label htmlFor="status-edit">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="status-edit"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
        </div>
        <div>
          <Label htmlFor="gender-edit">Gender</Label>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="gender-edit"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
           {form.formState.errors.gender && <p className="text-sm text-destructive mt-1">{form.formState.errors.gender.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="avatar-edit">Avatar Image (Optional, Max 2MB: JPG, PNG, GIF, WEBP)</Label>
        <Input
          id="avatar-edit"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleAvatarFileChange}
          ref={avatarFileInputRef}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        {form.formState.errors.avatarFile && <p className="text-sm text-destructive mt-1">{form.formState.errors.avatarFile.message}</p>}
        {avatarPreview && (
          <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
            <NextImage src={avatarPreview} alt="Avatar preview" width={100} height={100} className="rounded-md object-cover" data-ai-hint="upload preview person"/>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="salary-edit">Salary (Optional, Numbers only)</Label>
        <Input id="salary-edit" type="text" {...form.register('salary')} placeholder="e.g., 75000" inputMode="numeric" />
        {form.formState.errors.salary && <p className="text-sm text-destructive mt-1">{form.formState.errors.salary.message}</p>}
      </div>

      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton isImageUploading={isImageUploading} />
      </div>
    </form>
  );
}
