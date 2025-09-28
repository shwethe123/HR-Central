// src/app/(app)/resignations/add-resignation-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { addResignation, type AddResignationFormState } from './actions';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';

const ClientResignationSchema = z.object({
  employeeId: z.string().min(1, { message: "Please select an employee." }),
  noticeDate: z.string().min(1, { message: "Notice date is required." }),
  resignationDate: z.string().min(1, { message: "Resignation date is required." }),
  reason: z.string().optional(),
  rehireEligibility: z.enum(["Eligible", "Ineligible", "Conditional"], { required_error: "Re-hire eligibility is required." }),
  notes: z.string().optional(),
}).refine(data => new Date(data.resignationDate) >= new Date(data.noticeDate), {
    message: "Resignation date cannot be before the notice date.",
    path: ["resignationDate"],
});

type ResignationFormData = z.infer<typeof ClientResignationSchema>;

interface AddResignationFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

export function AddResignationForm({ employees, onFormSubmissionSuccess, className }: AddResignationFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(addResignation, { message: null, success: false });

  const form = useForm<ResignationFormData>({
    resolver: zodResolver(ClientResignationSchema),
    defaultValues: {
      employeeId: '',
      noticeDate: '',
      resignationDate: '',
      reason: '',
      rehireEligibility: 'Conditional',
      notes: '',
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success", description: state.message });
      form.reset();
      if (onFormSubmissionSuccess) onFormSubmissionSuccess();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);

  const onSubmit = (data: ResignationFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 max-h-[70vh] overflow-y-auto p-1", className)}>
      <div>
        <Label htmlFor="employeeId">Employee</Label>
        <Controller
          name="employeeId"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.status === 'Active').map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="noticeDate">Notice Date</Label>
          <Input id="noticeDate" type="date" {...form.register('noticeDate')} />
          {form.formState.errors.noticeDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.noticeDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="resignationDate">Resignation Date (Last Day)</Label>
          <Input id="resignationDate" type="date" {...form.register('resignationDate')} />
          {form.formState.errors.resignationDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.resignationDate.message}</p>}
        </div>
      </div>
       
      <div>
        <Label>Re-hire Eligibility</Label>
         <Controller
            name="rehireEligibility"
            control={form.control}
            render={({ field }) => (
                <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4 pt-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Eligible" id="eligible" />
                        <Label htmlFor="eligible">Eligible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Ineligible" id="ineligible" />
                        <Label htmlFor="ineligible">Ineligible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Conditional" id="conditional" />
                        <Label htmlFor="conditional">Conditional</Label>
                    </div>
                </RadioGroup>
            )}
        />
        {form.formState.errors.rehireEligibility && <p className="text-sm text-destructive mt-1">{form.formState.errors.rehireEligibility.message}</p>}
      </div>

      <div>
        <Label htmlFor="reason">Reason for Leaving (Optional)</Label>
        <Textarea id="reason" {...form.register('reason')} />
        {form.formState.errors.reason && <p className="text-sm text-destructive mt-1">{form.formState.errors.reason.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="notes">HR Notes (Optional)</Label>
        <Textarea id="notes" {...form.register('notes')} placeholder="E.g., reason for ineligibility, performance summary..."/>
        {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Record
        </Button>
      </div>
    </form>
  );
}
