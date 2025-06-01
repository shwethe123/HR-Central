
// src/app/(app)/wifi-bills/add-wifi-bill-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isValid as isDateValid } from 'date-fns';

import { addWifiBill, type AddWifiBillFormState } from './actions';
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
import type { WifiBill } from '@/types';

// Match server-side Zod schema structure, but use Date for client-side date pickers
const ClientWifiBillSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required." }),
  wifiProvider: z.string().min(1, { message: "WiFi provider is required." }),
  planName: z.string().min(1, { message: "Plan name is required." }),
  accountNumber: z.string().optional(),
  paymentCycle: z.enum(["Monthly", "2 Months", "Quarterly", "Annually"]),
  billAmount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(String(val).replace(/,/g, ''))), // Remove commas for parsing
    z.number({ invalid_type_error: "Bill amount must be a number." })
     .min(0, { message: "Bill amount cannot be negative." })
  ),
  currency: z.enum(["MMK", "USD"]),
  dueDate: z.date({ required_error: "Due date is required." }),
  paymentDate: z.date().optional().nullable(),
  status: z.enum(["Pending", "Paid", "Overdue", "Cancelled"]),
  invoiceUrl: z.string().url({ message: "Invalid URL format for invoice." }).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export type WifiBillFormData = z.infer<typeof ClientWifiBillSchema>;

// Placeholder data - in a real app, this might come from props or context
const MOCK_COMPANIES = ["Innovatech Solutions", "Synergy Corp", "QuantumLeap Inc.", "Lashio Main", "Taunggyi Branch"];
const MOCK_PROVIDERS = ["Myanmar Net", "5BB", "Ooredoo Fiber", "MPT Fiber", "Welink"];
const PAYMENT_CYCLES = ["Monthly", "2 Months", "Quarterly", "Annually"];
const CURRENCIES = ["MMK", "USD"];
const STATUS_OPTIONS = ["Pending", "Paid", "Overdue", "Cancelled"];

interface AddWifiBillFormProps {
  onFormSubmissionSuccess?: (newBillId?: string) => void;
  className?: string;
  initialData?: Partial<WifiBillFormData>; // For pre-filling the form (e.g., for renewal)
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Bill
    </Button>
  );
}

export function AddWifiBillForm({ onFormSubmissionSuccess, className, initialData }: AddWifiBillFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addWifiBill, { message: null, errors: {}, success: false });

  const getProcessedInitialData = (data?: Partial<WifiBillFormData>) => {
    if (!data) {
      return {
        companyName: '',
        wifiProvider: '',
        planName: '',
        accountNumber: '',
        paymentCycle: 'Monthly' as WifiBillFormData['paymentCycle'],
        billAmount: undefined,
        currency: 'MMK' as WifiBillFormData['currency'],
        dueDate: undefined,
        paymentDate: null,
        status: 'Pending' as WifiBillFormData['status'],
        invoiceUrl: '',
        notes: '',
      };
    }
    
    let dueDateProcessed: Date | undefined = undefined;
    if (data.dueDate) {
        if (data.dueDate instanceof Date && isDateValid(data.dueDate)) {
            dueDateProcessed = data.dueDate;
        } else if (typeof data.dueDate === 'string') {
            const parsed = parseISO(data.dueDate);
            if (isDateValid(parsed)) dueDateProcessed = parsed;
        }
    }

    let paymentDateProcessed: Date | null | undefined = null;
     if (data.paymentDate) {
        if (data.paymentDate instanceof Date && isDateValid(data.paymentDate)) {
            paymentDateProcessed = data.paymentDate;
        } else if (typeof data.paymentDate === 'string') {
            const parsed = parseISO(data.paymentDate);
            if (isDateValid(parsed)) paymentDateProcessed = parsed;
        }
    }

    return {
      ...data,
      dueDate: dueDateProcessed,
      paymentDate: paymentDateProcessed,
      // Ensure other enum types have fallbacks if initialData might be incomplete
      paymentCycle: data.paymentCycle || 'Monthly',
      currency: data.currency || 'MMK',
      status: data.status || 'Pending',
    };
  };


  const form = useForm<WifiBillFormData>({
    resolver: zodResolver(ClientWifiBillSchema),
    defaultValues: getProcessedInitialData(initialData),
  });

   useEffect(() => {
    // Reset form with new initialData when it changes (e.g., user clicks "Renew" on different bills)
    form.reset(getProcessedInitialData(initialData));
  }, [initialData, form.reset]);


  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(getProcessedInitialData()); // Reset to empty defaults after success
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newWifiBillId);
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Saving WiFi Bill",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);

  const onSubmit = (data: WifiBillFormData) => {
    const formData = new FormData();
    formData.append('companyName', data.companyName);
    formData.append('wifiProvider', data.wifiProvider);
    formData.append('planName', data.planName);
    if (data.accountNumber) formData.append('accountNumber', data.accountNumber);
    formData.append('paymentCycle', data.paymentCycle);
    formData.append('billAmount', String(data.billAmount));
    formData.append('currency', data.currency);
    formData.append('dueDate', format(data.dueDate, "yyyy-MM-dd"));
    if (data.paymentDate) {
      formData.append('paymentDate', format(data.paymentDate, "yyyy-MM-dd"));
    } else {
      formData.append('paymentDate', ''); // Send empty string if null/undefined for server action
    }
    formData.append('status', data.status);
    if (data.invoiceUrl) formData.append('invoiceUrl', data.invoiceUrl);
    if (data.notes) formData.append('notes', data.notes);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 overflow-y-auto max-h-[70vh] p-1 pr-3", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Controller
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="companyName"><SelectValue placeholder="Select Company" /></SelectTrigger>
                <SelectContent>
                  {MOCK_COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.companyName && <p className="text-sm text-destructive mt-1">{form.formState.errors.companyName.message}</p>}
        </div>
        <div>
          <Label htmlFor="wifiProvider">WiFi Provider</Label>
          <Controller
            control={form.control}
            name="wifiProvider"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="wifiProvider"><SelectValue placeholder="Select Provider" /></SelectTrigger>
                <SelectContent>
                  {MOCK_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.wifiProvider && <p className="text-sm text-destructive mt-1">{form.formState.errors.wifiProvider.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="planName">Plan Name</Label>
        <Input id="planName" {...form.register('planName')} placeholder="e.g., 100Mbps Fiber" />
        {form.formState.errors.planName && <p className="text-sm text-destructive mt-1">{form.formState.errors.planName.message}</p>}
      </div>

      <div>
        <Label htmlFor="accountNumber">Account Number (Optional)</Label>
        <Input id="accountNumber" {...form.register('accountNumber')} placeholder="e.g., 123456789" />
        {form.formState.errors.accountNumber && <p className="text-sm text-destructive mt-1">{form.formState.errors.accountNumber.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentCycle">Payment Cycle</Label>
          <Controller
            control={form.control}
            name="paymentCycle"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="paymentCycle"><SelectValue placeholder="Select Cycle" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_CYCLES.map(pc => <SelectItem key={pc} value={pc}>{pc}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.paymentCycle && <p className="text-sm text-destructive mt-1">{form.formState.errors.paymentCycle.message}</p>}
        </div>
        <div>
            <Label htmlFor="billAmount">Bill Amount</Label>
            <Input
                id="billAmount"
                type="text" // Use text to allow formatting, parse to number in schema
                {...form.register('billAmount')}
                placeholder="e.g., 50000"
                onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point if needed, or format with commas
                    const numericValue = value.replace(/[^0-9]/g, '');
                    form.setValue('billAmount', Number(numericValue) || undefined, { shouldValidate: true });
                }}
            />
            {form.formState.errors.billAmount && <p className="text-sm text-destructive mt-1">{form.formState.errors.billAmount.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Controller
            control={form.control}
            name="currency"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="currency"><SelectValue placeholder="Select Currency" /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.currency && <p className="text-sm text-destructive mt-1">{form.formState.errors.currency.message}</p>}
        </div>
         <div>
          <Label htmlFor="status">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="status"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.status && <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Controller
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" id="dueDate" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value && isDateValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.dueDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.dueDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
          <Controller
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" id="paymentDate" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value && isDateValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.paymentDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.paymentDate.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="invoiceUrl">Invoice URL (Optional)</Label>
        <Input id="invoiceUrl" {...form.register('invoiceUrl')} placeholder="https://example.com/invoice.pdf" />
        {form.formState.errors.invoiceUrl && <p className="text-sm text-destructive mt-1">{form.formState.errors.invoiceUrl.message}</p>}
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" {...form.register('notes')} rows={3} placeholder="Any additional notes..." />
        {form.formState.errors.notes && <p className="text-sm text-destructive mt-1">{form.formState.errors.notes.message}</p>}
      </div>

      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

