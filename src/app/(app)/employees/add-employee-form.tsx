
// src/app/(app)/employees/add-employee-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { addEmployee, type AddEmployeeFormState } from './actions';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase'; // Import storage
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Import storage functions


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
  avatar: (typeof window !== 'undefined' ? z.instanceof(FileList) : z.any()) 
    .optional()
    .refine(
      (fileList) => !fileList || fileList.length === 0 || fileList.length === 1,
      {
        message: "Only one avatar image can be uploaded.",
      }
    )
    .transform((fileList) => (fileList && fileList.length > 0 ? fileList[0] : undefined)), 
  salary: z.string().optional().refine(val => val === undefined || val === "" || !isNaN(parseFloat(val)), {
    message: "Salary must be a number or empty.",
  }),
});

type EmployeeFormData = z.infer<typeof ClientEmployeeSchema>;

interface AddEmployeeFormProps {
  onFormSubmissionSuccess?: (newEmployeeId?: string) => void;
  uniqueDepartments: string[];
  uniqueRoles: string[];
  uniqueCompanies: string[];
  className?: string;
}

function SubmitButton({ isImageUploading }: { isImageUploading: boolean }) {
  const { pending: isActionPending } = useFormStatus();
  const isDisabled = isImageUploading || isActionPending;
  
  let buttonText = "Add Employee";
  if (isImageUploading) {
    buttonText = "Uploading Image...";
  } else if (isActionPending) {
    buttonText = "Adding Employee...";
  }

  return (
    <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
      {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
}

export function AddEmployeeForm({ onFormSubmissionSuccess, uniqueDepartments, uniqueRoles, uniqueCompanies, className }: AddEmployeeFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addEmployee, { message: null, errors: {}, success: false });
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(ClientEmployeeSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      company: '',
      department: '',
      role: '',
      email: '',
      phone: '',
      startDate: undefined, 
      status: 'Active',
      gender: 'Prefer not to say',
      avatar: undefined, 
      salary: '',
    },
  });

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(); 
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newEmployeeId); 
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.startsWith("Adding employee failed:") || state.message.startsWith("Validation failed."))) {
       toast({
        title: "Error Adding Employee",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);
  
  const onSubmit = async (data: EmployeeFormData) => {
    const formData = new FormData();
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

    let avatarUrl = '';
    const fileToUpload = data.avatar; 

    if (fileToUpload) {
      setIsImageUploading(true);
      try {
        const sRef = storageRef(storage, `employee-avatars/${Date.now()}-${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(sRef, fileToUpload);
        
        await uploadTask; 
        avatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
        toast({ title: "Avatar Uploaded", description: "Image successfully uploaded." });
      } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({
          title: "Avatar Upload Failed",
          description: "Could not upload avatar. Proceeding without avatar.",
          variant: "destructive",
        });
      } finally {
        setIsImageUploading(false);
      }
    }
    
    formData.append('avatar', avatarUrl);
    
    startTransition(() => {
        formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor="name-add">Full Name</Label>
        <Input id="name-add" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
        {state?.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="employeeId-add">Employee ID</Label>
        <Input id="employeeId-add" {...form.register('employeeId')} />
        {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
        {state?.errors?.employeeId && <p className="text-sm text-destructive mt-1">{state.errors.employeeId.join(', ')}</p>}
      </div>
      
      <div>
        <Label htmlFor="company-add">Company</Label>
        <Controller
          control={form.control}
          name="company"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} defaultValue="">
              <SelectTrigger id="company-add">
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
        {state?.errors?.company && <p className="text-sm text-destructive mt-1">{state.errors.company.join(', ')}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department-add">Department</Label>
          <Controller
            control={form.control}
            name="department"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                <SelectTrigger id="department-add">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                {["G-ထွက်", "လက်ကားပိုင်း", "လက်လီပိုင်း", "ကားအော်ဒါ", "အဝင်ပိုင်း", "ပစ္စည်းမှာ", "အကြွေးကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", "ငွေကိုင်"].map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                  {uniqueDepartments.filter(dep => !["G-ထွက်", "လက်ကားပိုင်း", "လက်လီပိုင်း", "ကားအော်ဒါ", "အဝင်ပိုင်း", "ပစ္စည်းမှာ", "အကြွေးကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", "ငွေကိုင်"].includes(dep)).map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                  </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.department && <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>}
          {state?.errors?.department && <p className="text-sm text-destructive mt-1">{state.errors.department.join(', ')}</p>}
        </div>

        <div>
          <Label htmlFor="role-add">Role</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                <SelectTrigger id="role-add">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {["ခေါင်းဆောင်", "စာရင်းကိုင်", "Hစစ်", "ပစ္စည်းမှာ", "အဝင်", "ငွေကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်", ].map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                  {uniqueDepartments.filter(dep => !["ခေါင်းဆောင်", "စာရင်းကိုင်", "Hစစ်", "ပစ္စည်းမှာ", "အဝင်", "ပစ္စည်းမှာ", "ငွေကိုင်", "စက်ကိုင်", "အပြင်သွား", "စီစစ်ရေး", "ကားတင်"].includes(dep)).map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.role && <p className="text-sm text-destructive mt-1">{form.formState.errors.role.message}</p>}
          {state?.errors?.role && <p className="text-sm text-destructive mt-1">{state.errors.role.join(', ')}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="email-add">Email Address</Label>
        <Input id="email-add" type="email" {...form.register('email')} />
        {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
        {state?.errors?.email && <p className="text-sm text-destructive mt-1">{state.errors.email.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="phone-add">Phone Number (Optional)</Label>
        <Input id="phone-add" type="tel" {...form.register('phone')} />
        {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
        {state?.errors?.phone && <p className="text-sm text-destructive mt-1">{state.errors.phone.join(', ')}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="startDate-add">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="startDate-add"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>}
          {state?.errors?.startDate && <p className="text-sm text-destructive mt-1">{state.errors.startDate.join(', ')}</p>}
        </div>

        <div>
          <Label htmlFor="status-add">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="Active">
                <SelectTrigger id="status-add">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
          {state?.errors?.status && <p className="text-sm text-destructive mt-1">{state.errors.status.join(', ')}</p>}
        </div>
        <div>
          <Label htmlFor="gender-add">Gender</Label>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="Prefer not to say">
                <SelectTrigger id="gender-add">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
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
          {state?.errors?.gender && <p className="text-sm text-destructive mt-1">{state.errors.gender.join(', ')}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="avatar-add">Avatar Image (Optional)</Label>
        <Input id="avatar-add" type="file" {...form.register('avatar')} accept="image/*" />
        {form.formState.errors.avatar && <p className="text-sm text-destructive mt-1">{form.formState.errors.avatar.message}</p>}
        {state?.errors?.avatar && <p className="text-sm text-destructive mt-1">{state.errors.avatar.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="salary-add">Salary (Optional, Numbers only)</Label>
        <Input id="salary-add" type="text" {...form.register('salary')} placeholder="e.g., 75000" inputMode="numeric" />
        {form.formState.errors.salary && <p className="text-sm text-destructive mt-1">{form.formState.errors.salary.message}</p>}
        {state?.errors?.salary && <p className="text-sm text-destructive mt-1">{state.errors.salary.join(', ')}</p>}
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton isImageUploading={isImageUploading} />
      </div>
    </form>
  );
}
