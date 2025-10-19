// src/app/(app)/device-management/computer-component-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { addComputerComponent, updateComputerComponent } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, ComputerComponent } from '@/types';

const COMPONENT_TYPES: ComputerComponent['componentType'][] = ['Monitor', 'Motherboard', 'CPU', 'RAM', 'Storage', 'GPU', 'PSU', 'Case', 'Other'];
const COMPONENT_STATUSES: ComputerComponent['status'][] = ['In Use', 'In Stock', 'Damaged', 'Retired'];

const ClientComponentSchema = z.object({
  id: z.string().optional(),
  componentType: z.enum(COMPONENT_TYPES, { required_error: "Component type is required." }),
  brand: z.string().min(1, "Brand is required."),
  model: z.string().min(1, "Model is required."),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  status: z.enum(COMPONENT_STATUSES),
  assignedToEmployeeId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type ComponentFormData = z.infer<typeof ClientComponentSchema>;

interface ComponentFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: () => void;
  className?: string;
  componentToEdit?: ComputerComponent;
}

export function ComputerComponentForm({ employees, onFormSubmissionSuccess, className, componentToEdit }: ComponentFormProps) {
  const { toast } = useToast();
  const isEditing = !!componentToEdit;

  const [state, formAction, isPending] = useActionState(isEditing ? updateComputerComponent : addComputerComponent, { message: null, success: false });

  const form = useForm<ComponentFormData>({
    resolver: zodResolver(ClientComponentSchema),
    defaultValues: {
      id: componentToEdit?.id || '',
      componentType: componentToEdit?.componentType || undefined,
      brand: componentToEdit?.brand || '',
      model: componentToEdit?.model || '',
      serialNumber: componentToEdit?.serialNumber || '',
      purchaseDate: componentToEdit?.purchaseDate || '',
      status: componentToEdit?.status || 'In Stock',
      assignedToEmployeeId: componentToEdit?.assignedToEmployeeId || 'unassigned',
      notes: componentToEdit?.notes || '',
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

  const onSubmit = (data: ComponentFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (key === 'assignedToEmployeeId' && value === 'unassigned') {
             formData.append(key, '');
        } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4", className)}>
      {isEditing && <input type="hidden" {...form.register('id')} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="componentType">Component Type</Label>
          <Controller name="componentType" control={form.control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>{COMPONENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          {form.formState.errors.componentType && <p className="text-sm text-destructive mt-1">{form.formState.errors.componentType.message}</p>}
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Controller name="status" control={form.control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
              <SelectContent>{COMPONENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="brand">Brand</Label>
        <Input id="brand" {...form.register('brand')} placeholder="e.g., Samsung, Intel, Nvidia" />
        {form.formState.errors.brand && <p className="text-sm text-destructive mt-1">{form.formState.errors.brand.message}</p>}
      </div>
      <div>
        <Label htmlFor="model">Model</Label>
        <Input id="model" {...form.register('model')} placeholder="e.g., Odyssey G9, Core i9-14900K, GeForce RTX 4090" />
        {form.formState.errors.model && <p className="text-sm text-destructive mt-1">{form.formState.errors.model.message}</p>}
      </div>
      <div>
        <Label htmlFor="serialNumber">Serial Number (Optional)</Label>
        <Input id="serialNumber" {...form.register('serialNumber')} />
      </div>
       <div>
        <Label htmlFor="purchaseDate">Purchase Date (Optional)</Label>
        <Input id="purchaseDate" type="date" {...form.register('purchaseDate')} />
        {form.formState.errors.purchaseDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.purchaseDate.message}</p>}
      </div>
      <div>
        <Label htmlFor="assignedToEmployeeId">Assigned To (Optional)</Label>
        <Controller name="assignedToEmployeeId" control={form.control} render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">None (In Stock)</SelectItem>
              {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
      </div>
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" {...form.register('notes')} placeholder="e.g., Warranty details, specific configurations..." />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isEditing ? 'Save Changes' : 'Add Component'}
        </Button>
      </div>
    </form>
  );
}
