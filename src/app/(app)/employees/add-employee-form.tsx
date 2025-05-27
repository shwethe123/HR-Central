
// src/app/(app)/employees/add-employee-form.tsx
'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
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

const ClientEmployeeSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  employeeId: z.string().min(3, { message: "Employee ID must be at least 3 characters." }),
  department: z.string().min(1, { message: "Department is required." }),
  role: z.string().min(1, { message: "Role is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  status: z.enum(["Active", "Inactive"],{ required_error: "Status is required." }),
  avatar: z.string().url({ message: "Avatar must be a valid URL (e.g., https://...)" }).optional().or(z.literal('')),
});

type EmployeeFormData = z.infer<typeof ClientEmployeeSchema>;

interface AddEmployeeFormProps {
  onFormSubmissionSuccess?: () => void;
  uniqueDepartments: string[];
  uniqueRoles: string[];
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Add Employee
    </Button>
  );
}

export function AddEmployeeForm({ onFormSubmissionSuccess, uniqueDepartments, uniqueRoles, className }: AddEmployeeFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useFormState(addEmployee, { message: null, errors: {}, success: false });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(ClientEmployeeSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      department: '',
      role: '',
      email: '',
      phone: '',
      startDate: undefined, // react-hook-form prefers undefined for controlled date inputs
      status: 'Active',
      avatar: '',
    },
  });

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(); // Reset form fields on success
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(); // Callback to close dialog etc.
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
    formData.append('department', data.department);
    formData.append('role', data.role);
    formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    formData.append('startDate', format(data.startDate, "yyyy-MM-dd"));
    formData.append('status', data.status);
    if (data.avatar) formData.append('avatar', data.avatar);
    
    formAction(formData);
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department-add">Department</Label>
          <Controller
            control={form.control}
            name="department"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="department-add">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="role-add">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
      </div>

      <div>
        <Label htmlFor="avatar-add">Avatar URL (Optional)</Label>
        <Input id="avatar-add" type="url" {...form.register('avatar')} placeholder="https://placehold.co/100x100.png" />
        {form.formState.errors.avatar && <p className="text-sm text-destructive mt-1">{form.formState.errors.avatar.message}</p>}
        {state?.errors?.avatar && <p className="text-sm text-destructive mt-1">{state.errors.avatar.join(', ')}</p>}
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
