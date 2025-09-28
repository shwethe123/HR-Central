
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, LeaveRequest } from '@/types';

const LEAVE_TYPES: LeaveRequest['leaveType'][] = [
  "ကြိုတင်ခွင့်",
  "အလုပ်နောက်ကျ",
  "ခွင့်(နေမကောင်း)",
  "ခွင့်ရက်ရှည်",
  "ခွင့်မဲ့ပျက်",
  "အပြစ်ပေး (ဖိုင်း)",
];

const ClientLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, { message: "Employee is required." }),
  leaveType: z.enum(["ကြိုတင်ခွင့်", "အလုပ်နောက်ကျ", "ခွင့်(နေမကောင်း)", "ခွင့်ရက်ရှည်", "ခွင့်မဲ့ပျက်", "အပြစ်ပေး (ဖိုင်း)"], {
    required_error: "Leave type is required.",
  }),
  startDate: z.string()
    .refine(val => val && !isNaN(Date.parse(val)), { message: "Start date is required and must be a valid date." }),
  endDate: z.string()
    .refine(val => val && !isNaN(Date.parse(val)), { message: "End date is required and must be a valid date." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }).max(500, { message: "Reason cannot exceed 500 characters." }),
}).refine(data => {
    if (data.startDate && data.endDate && !isNaN(Date.parse(data.startDate)) && !isNaN(Date.parse(data.endDate))) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true; 
}, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof ClientLeaveRequestSchema>;

interface LeaveRequestFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: (newRequestId?: string) => void;
  className?: string;
}

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const pending = isSubmitting;

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Submitting..." : "Submit Request"}
    </Button>
  );
}

export function LeaveRequestForm({ employees, onFormSubmissionSuccess, className }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const [state, formAction, isActionPending] = useActionState(submitLeaveRequest, { message: null, errors: {}, success: false });

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(ClientLeaveRequestSchema),
    defaultValues: {
      employeeId: '',
      leaveType: undefined,
      startDate: '', 
      endDate: '',   
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
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newLeaveRequestId);
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
    formData.append('leaveType', data.leaveType);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    formData.append('reason', data.reason);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeId-leave">Employee</Label>
          <Controller
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="">
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
        <div>
          <Label htmlFor="leaveType-leave">Leave Type</Label>
          <Controller
            control={form.control}
            name="leaveType"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                <SelectTrigger id="leaveType-leave">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.leaveType && <p className="text-sm text-destructive mt-1">{form.formState.errors.leaveType.message}</p>}
          {state?.errors?.leaveType && <p className="text-sm text-destructive mt-1">{state.errors.leaveType.join(', ')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate-leave">Start Date</Label>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <Input
                type="date"
                id="startDate-leave"
                {...field}
                value={field.value || ''} 
                className="block w-full"
              />
            )}
          />
          {form.formState.errors.startDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>}
          {state?.errors?.startDate && <p className="text-sm text-destructive mt-1">{state.errors.startDate.join(', ')}</p>}
        </div>
        <div>
          <Label htmlFor="endDate-leave">End Date</Label>
          <Controller
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <Input
                type="date"
                id="endDate-leave"
                {...field}
                value={field.value || ''} 
                className="block w-full"
              />
            )}
          />
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
        <SubmitButton isSubmitting={isActionPending} />
      </div>
    </form>
  );
}
