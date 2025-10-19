// src/app/(app)/device-management/edit-device-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useMemo, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateDevice, type DeviceFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Eye, EyeOff, AlertTriangle, PlusCircle, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, Smartphone } from '@/types';
import { Separator } from '@/components/ui/separator';

const ClientCredentialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
});

const ClientDeviceSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1, { message: "Please select a company." }),
  department: z.string().min(1, { message: "Please select a department." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional(),
  purchaseDate: z.string().min(1, { message: "Purchase date is required." }),
  issueDate: z.string().optional(),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().optional(),
  credentials: z.array(ClientCredentialSchema).optional(),
}).refine(data => {
    if (data.status !== 'Active') {
        return data.issueDate && data.issueDate.length > 0 && !isNaN(Date.parse(data.issueDate));
    }
    return true;
}, {
    message: "Issue date is required when status is not 'Active'.",
    path: ['issueDate'],
});

type DeviceFormData = z.infer<typeof ClientDeviceSchema>;

interface EditDeviceFormProps {
  deviceToEdit: Smartphone;
  employees: Employee[];
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

export function EditDeviceForm({ deviceToEdit, employees, onFormSubmissionSuccess, className }: EditDeviceFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(updateDevice, { message: null, success: false });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(ClientDeviceSchema),
    defaultValues: {
      id: deviceToEdit.id,
      company: deviceToEdit.company || '',
      department: deviceToEdit.department || '',
      phoneModel: deviceToEdit.phoneModel || '',
      imei: deviceToEdit.imei || '',
      purchaseDate: deviceToEdit.purchaseDate || '',
      issueDate: deviceToEdit.issueDate || '',
      status: deviceToEdit.status || 'Active',
      notes: deviceToEdit.notes || '',
      credentials: deviceToEdit.credentials || [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "credentials",
  });

  const selectedCompany = form.watch('company');
  const deviceStatus = form.watch('status');

  const uniqueCompanies = useMemo(() => {
    return [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [employees]);

  const departmentsForSelectedCompany = useMemo(() => {
    if (!selectedCompany) return [];
    return [...new Set(employees.filter(emp => emp.company === selectedCompany).map(emp => emp.department))].sort();
  }, [employees, selectedCompany]);

  useEffect(() => {
    form.reset({
      id: deviceToEdit.id,
      company: deviceToEdit.company || '',
      department: deviceToEdit.department || '',
      phoneModel: deviceToEdit.phoneModel || '',
      imei: deviceToEdit.imei || '',
      purchaseDate: deviceToEdit.purchaseDate || '',
      issueDate: deviceToEdit.issueDate || '',
      status: deviceToEdit.status || 'Active',
      notes: deviceToEdit.notes || '',
      credentials: deviceToEdit.credentials || [],
    });
  }, [deviceToEdit, form.reset]);
  
  useEffect(() => {
    if (selectedCompany && deviceToEdit.company === selectedCompany) {
      form.setValue('department', deviceToEdit.department);
    } else if (form.getValues('company') !== selectedCompany) {
        // Company has changed, reset department
        form.setValue('department', '');
    }
  }, [selectedCompany, form, deviceToEdit.company, deviceToEdit.department]);


  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success", description: state.message });
      if (onFormSubmissionSuccess) onFormSubmissionSuccess();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onFormSubmissionSuccess]);

  const onSubmit = (data: DeviceFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'credentials' && Array.isArray(value)) {
          value.forEach((cred, index) => {
              Object.entries(cred).forEach(([credKey, credValue]) => {
                  if (credValue !== undefined && credValue !== null) {
                      formData.append(`credentials[${index}].${credKey}`, String(credValue));
                  }
              });
          });
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };
  
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4", className)}>
      <input type="hidden" {...form.register('id')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company-edit">Company</Label>
          <Controller
            name="company"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {uniqueCompanies.map(comp => (
                    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.company && <p className="text-sm text-destructive mt-1">{form.formState.errors.company.message}</p>}
        </div>
        <div>
          <Label htmlFor="department-edit">Assign to Department</Label>
          <Controller
            name="department"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCompany}>
                <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                <SelectContent>
                  {departmentsForSelectedCompany.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.department && <p className="text-sm text-destructive mt-1">{form.formState.errors.department.message}</p>}
        </div>
      </div>
      <div>
          <Label htmlFor="phoneModel-edit">Phone Model</Label>
          <Input id="phoneModel-edit" {...form.register('phoneModel')} placeholder="e.g., iPhone 15 Pro" />
          {form.formState.errors.phoneModel && <p className="text-sm text-destructive mt-1">{form.formState.errors.phoneModel.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="imei-edit">IMEI Number (Optional)</Label>
        <Input id="imei-edit" {...form.register('imei')} placeholder="Enter device IMEI" />
        {form.formState.errors.imei && <p className="text-sm text-destructive mt-1">{form.formState.errors.imei.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="purchaseDate-edit">Purchase Date</Label>
          <Input id="purchaseDate-edit" type="date" {...form.register('purchaseDate')} />
          {form.formState.errors.purchaseDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.purchaseDate.message}</p>}
        </div>
        <div>
            <Label htmlFor="status-edit">Device Status</Label>
            <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                    {(['Active', 'Damaged', 'Returned', 'Lost'] as const).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            )}
            />
            {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
        </div>
      </div>

       <div>
          <Label htmlFor="issueDate-edit">Issue Date</Label>
          <Input 
            id="issueDate-edit" 
            type="date" 
            {...form.register('issueDate')} 
            disabled={deviceStatus === 'Active'}
          />
          {form.formState.errors.issueDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.issueDate.message}</p>}
          {deviceStatus === 'Active' && <p className="text-xs text-muted-foreground mt-1">Issue date is only applicable if the status is not 'Active'.</p>}
      </div>

      <Separator className="my-6" />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> App & Email Credentials</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: Date.now().toString(), name: '', username: '', password: '' })}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Credential
            </Button>
        </div>
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Warning: Storing passwords directly is a security risk. Only use for non-critical accounts.</span>
        </div>
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3 relative bg-muted/30">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor={`credentials[${index}].name`}>App/Service Name</Label>
                            <Input {...form.register(`credentials.${index}.name`)} placeholder="e.g., Zalo, Gmail" />
                            {form.formState.errors.credentials?.[index]?.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.credentials?.[index]?.name?.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor={`credentials[${index}].username`}>Username/Email</Label>
                            <Input {...form.register(`credentials.${index}.username`)} placeholder="e.g., user.name or user@example.com" />
                            {form.formState.errors.credentials?.[index]?.username && <p className="text-sm text-destructive mt-1">{form.formState.errors.credentials?.[index]?.username?.message}</p>}
                        </div>
                     </div>
                     <div className="relative">
                        <Label htmlFor={`credentials[${index}].password`}>Password (Optional)</Label>
                        <Input {...form.register(`credentials.${index}.password`)} type={visiblePasswords[field.id] ? 'text' : 'password'} placeholder="Enter password" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => togglePasswordVisibility(field.id)}>
                            {visiblePasswords[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                     </div>
                      <Button type="button" variant="destructive" size="sm" className="absolute -top-3 -right-3 h-7 w-7 p-0" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove Credential</span>
                    </Button>
                </div>
            ))}
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <Label htmlFor="notes-edit">Notes (Optional)</Label>
        <Textarea id="notes-edit" {...form.register('notes')} placeholder="e.g., minor scratch on screen, charger included..." />
        {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
