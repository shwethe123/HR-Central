// src/app/(app)/developer-attendance/add-holiday-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addPublicHoliday, type AddPublicHolidayState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ClientHolidaySchema = z.object({
  name: z.string().min(2, { message: "Holiday name is required." }),
  date: z.string().min(1, { message: "Date is required." }),
});

type HolidayFormData = z.infer<typeof ClientHolidaySchema>;

interface AddHolidayFormProps {
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Add Holiday
    </Button>
  );
}

export function AddHolidayForm({ onFormSubmissionSuccess, className }: AddHolidayFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addPublicHoliday, { message: null, success: false });

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(ClientHolidaySchema),
    defaultValues: { name: '', date: '' },
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success", description: state.message });
      form.reset();
      if (onFormSubmissionSuccess) onFormSubmissionSuccess();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.errors?._form?.[0] || state.message, variant: "destructive" });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);

  const onSubmit = (data: HolidayFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('date', data.date);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 pt-2", className)}>
      <div>
        <Label htmlFor="holidayName">Holiday Name</Label>
        <Input id="holidayName" {...form.register('name')} placeholder="e.g., Independence Day" />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="holidayDate">Date</Label>
        <Input id="holidayDate" type="date" {...form.register('date')} />
        {form.formState.errors.date && <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>}
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
