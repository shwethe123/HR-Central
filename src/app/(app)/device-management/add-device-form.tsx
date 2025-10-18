// src/app/(app)/device-management/add-device-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDevice, type DeviceFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, Smartphone } from '@/types';

const ClientDeviceSchema = z.object({
  employeeId: z.string().min(1, { message: "Please select an employee." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional(),
  purchaseDate: z.string().min(1, { message: "Purchase date is required." }),
  issueDate: z.string().min(1, { message: "Issue date is required." }),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().optional(),
});

type DeviceFormData = z.infer<typeof ClientDeviceSchema>;

interface AddDeviceFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

export function AddDeviceForm({ employees, onFormSubmissionSuccess, className }: AddDeviceFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(addDevice, { message: null, success: false });

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(ClientDeviceSchema),
    defaultValues: {
      employeeId: '',
      phoneModel: '',
      imei: '',
      purchaseDate: '',
      issueDate: '',
      status: 'Active',
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

  const onSubmit = (data: DeviceFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeId">Assign to Employee</Label>
          <Controller
            name="employeeId"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.employeeId && <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeId.message}</p>}
        </div>
        <div>
          <Label htmlFor="phoneModel">Phone Model</Label>
          <Input id="phoneModel" {...form.register('phoneModel')} placeholder="e.g., iPhone 15 Pro" />
          {form.formState.errors.phoneModel && <p className="text-sm text-destructive mt-1">{form.formState.errors.phoneModel.message}</p>}
        </div>
      </div>
      
      <div>
        <Label htmlFor="imei">IMEI Number (Optional)</Label>
        <Input id="imei" {...form.register('imei')} placeholder="Enter device IMEI" />
        {form.formState.errors.imei && <p className="text-sm text-destructive mt-1">{form.formState.errors.imei.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input id="purchaseDate" type="date" {...form.register('purchaseDate')} />
          {form.formState.errors.purchaseDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.purchaseDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input id="issueDate" type="date" {...form.register('issueDate')} />
          {form.formState.errors.issueDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.issueDate.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Device Status</Label>
        <Controller
          name="status"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {(['Active', 'Damaged', 'Returned', 'Lost'] as Smartphone['status'][]).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" {...form.register('notes')} placeholder="e.g., minor scratch on screen, charger included..." />
        {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Record
        </Button>
      </div>
    </form>
  );
}
