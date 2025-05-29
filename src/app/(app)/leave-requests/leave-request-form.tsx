
'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { submitLeaveRequest, type SubmitLeaveRequestFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { Employee } from '@/types';

const ClientLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee is required." }),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }).max(500, { message: "Reason cannot exceed 500 characters." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof ClientLeaveRequestSchema>;

interface LeaveRequestFormProps {
  employees: Employee[]; // To populate the employee select dropdown
  onFormSubmissionSuccess?: (newRequest: any) => void; // Pass back the new request
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Submit Request
    </Button>
  );
}

export function LeaveRequestForm({ employees, onFormSubmissionSuccess, className }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(submitLeaveRequest, { message: null, errors: {}, success: false });

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(ClientLeaveRequestSchema),
    defaultValues: {
      employeeId: '',
      startDate: undefined,
      endDate: undefined,
      reason: '',
    },
  });

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(); 
      if (onFormSubmissionSuccess && state.newLeaveRequest) {
        onFormSubmissionSuccess(state.newLeaveRequest); 
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Submitting Request",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);
  
  const onSubmit = (data: LeaveRequestFormData) => {
    const formData = new FormData();
    formData.append('employeeId', data.employeeId);
    const selectedEmployee = employees.find(emp => emp.id === data.employeeId);
    formData.append('employeeName', selectedEmployee?.name || 'Unknown Employee');
    formData.append('startDate', format(data.startDate, "yyyy-MM-dd"));
    formData.append('endDate', format(data.endDate, "yyyy-MM-dd"));
    formData.append('reason', data.reason);
    
    formAction(formData);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div>
        <Label htmlFor="employeeId-leave">Employee</Label>
        <Controller
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="employeeId-leave">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
        {state?.errors?.employeeId && <p className="text-sm text-destructive mt-1">{state.errors.employeeId.join(', ')}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate-leave">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="startDate-leave"
                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                  > <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
            )} />
          {form.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>}
          {state?.errors?.startDate && <p className="text-sm text-destructive mt-1">{state.errors.startDate.join(', ')}</p>}
        </div>
        <div>
          <Label htmlFor="endDate-leave">End Date</Label>
          <Controller
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="endDate-leave"
                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                  > <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
            )} />
          {form.formState.errors.endDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>}
          {state?.errors?.endDate && <p className="text-sm text-destructive mt-1">{state.errors.endDate.join(', ')}</p>}
        </div>
      </div>
      
      <div>
        <Label htmlFor="reason-leave">Reason for Leave</Label>
        <Textarea
          id="reason-leave"
          {...form.register('reason')}
          rows={4}
          placeholder="Briefly explain the reason for your leave..." />
        {form.formState.errors.reason && <p className="text-sm text-destructive mt-1">{form.formState.errors.reason.message}</p>}
        {state?.errors?.reason && <p className="text-sm text-destructive mt-1">{state.errors.reason.join(', ')}</p>}
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
