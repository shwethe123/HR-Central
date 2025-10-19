// src/app/(app)/device-management/add-device-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useState, useMemo } from 'react';
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
import { Loader2, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, Smartphone } from '@/types';
import { Separator } from '@/components/ui/separator';

const ClientDeviceSchema = z.object({
  company: z.string().min(1, { message: "Please select a company." }),
  department: z.string().min(1, { message: "Please select a department." }),
  phoneModel: z.string().min(2, { message: "Phone model is required." }),
  imei: z.string().optional(),
  purchaseDate: z.string().min(1, { message: "Purchase date is required." }),
  issueDate: z.string().optional(),
  status: z.enum(["Active", "Damaged", "Returned", "Lost"]),
  notes: z.string().optional(),
  // New credential fields
  assignedAppName: z.string().optional(),
  assignedAppUsername: z.string().optional(),
  assignedAppPassword: z.string().optional(),
  assignedEmailAccount: z.string().optional(),
  assignedEmailPassword: z.string().optional(),
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

interface AddDeviceFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

export function AddDeviceForm({ employees, onFormSubmissionSuccess, className }: AddDeviceFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(addDevice, { message: null, success: false });
  const [showAppPass, setShowAppPass] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(ClientDeviceSchema),
    defaultValues: {
      company: '',
      department: '',
      phoneModel: '',
      imei: '',
      purchaseDate: '',
      issueDate: '',
      status: 'Active',
      notes: '',
      assignedAppName: '',
      assignedAppUsername: '',
      assignedAppPassword: '',
      assignedEmailAccount: '',
      assignedEmailPassword: '',
    },
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
    form.setValue('department', '');
  }, [selectedCompany, form]);


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
      if (value !== undefined && value !== null) {
         formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
          <Label htmlFor="company">Company</Label>
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
          <Label htmlFor="department">Assign to Department</Label>
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
        <Label htmlFor="phoneModel">Phone Model</Label>
        <Input id="phoneModel" {...form.register('phoneModel')} placeholder="e.g., iPhone 15 Pro" />
        {form.formState.errors.phoneModel && <p className="text-sm text-destructive mt-1">{form.formState.errors.phoneModel.message}</p>}
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
      </div>
      
      <div>
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input 
            id="issueDate" 
            type="date" 
            {...form.register('issueDate')} 
            disabled={deviceStatus === 'Active'} 
          />
          {form.formState.errors.issueDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.issueDate.message}</p>}
          {deviceStatus === 'Active' && <p className="text-xs text-muted-foreground mt-1">Issue date is only applicable if the status is not 'Active'.</p>}
      </div>
      
      <Separator className="my-6" />
      
      <div className="space-y-2">
        <h3 className="text-md font-semibold flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> App & Email Credentials</h3>
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Warning: Storing passwords directly is a security risk. Only use for non-critical accounts.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="assignedAppName">App Name (Optional)</Label>
            <Input id="assignedAppName" {...form.register('assignedAppName')} placeholder="e.g., Zalo"/>
        </div>
        <div>
            <Label htmlFor="assignedAppUsername">App Username (Optional)</Label>
            <Input id="assignedAppUsername" {...form.register('assignedAppUsername')} placeholder="e.g., user.name" />
        </div>
      </div>
       <div className="relative">
          <Label htmlFor="assignedAppPassword">App Password (Optional)</Label>
          <Input id="assignedAppPassword" type={showAppPass ? 'text' : 'password'} {...form.register('assignedAppPassword')} placeholder="Enter app password" />
           <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowAppPass(!showAppPass)}>
            {showAppPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="assignedEmailAccount">Email Account (Optional)</Label>
            <Input id="assignedEmailAccount" {...form.register('assignedEmailAccount')} placeholder="e.g., company_user@gmail.com"/>
        </div>
         <div className="relative">
            <Label htmlFor="assignedEmailPassword">Email Password (Optional)</Label>
            <Input id="assignedEmailPassword" type={showEmailPass ? 'text' : 'password'} {...form.register('assignedEmailPassword')} placeholder="Enter email password" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowEmailPass(!showEmailPass)}>
                {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
      </div>


      <Separator className="my-6" />

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
