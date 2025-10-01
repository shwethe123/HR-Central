// src/app/(app)/developer-attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useActionState, startTransition } from 'react';
import type { Employee, DeveloperAttendance } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addDeveloperLeave, type AddDeveloperLeaveState } from "./actions";
import { Code2, PlusCircle, Loader2, Calendar, User, DollarSign, AlertCircle, Wallet, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const FREE_LEAVE_DAYS = 4;

const formatCurrency = (amount: number) => {
    // This function will now only handle formatting a number to a string with commas.
    // It will not perform rounding.
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
};


// Client-side Zod schema for the leave form
const ClientLeaveFormSchema = z.object({
  leaveDate: z.string().min(1, { message: "Leave date is required." }),
  reason: z.string().max(500).optional(),
});
type LeaveFormData = z.infer<typeof ClientLeaveFormSchema>;

export default function DeveloperAttendancePage() {
  const [developers, setDevelopers] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<DeveloperAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Employee | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchDevelopersAndAttendance = useCallback(async (month: Date) => {
    setIsLoading(true);
    try {
      // Fetch developers
      const developersQuery = query(collection(db, "developers"));
      const devSnapshot = await getDocs(developersQuery);
      const fetchedDevelopers: Employee[] = devSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setDevelopers(fetchedDevelopers);

      // Fetch attendances for the selected month
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const attendanceQuery = query(
        collection(db, "developerAttendances"),
        where('leaveDate', '>=', monthStart),
        where('leaveDate', '<=', monthEnd)
      );
      const attSnapshot = await getDocs(attendanceQuery);
      const fetchedAttendances: DeveloperAttendance[] = attSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeveloperAttendance));
      setAttendances(fetchedAttendances);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch developer or attendance data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDevelopersAndAttendance(currentMonth);
  }, [currentMonth, fetchDevelopersAndAttendance]);
  
  const handleAddLeaveClick = (dev: Employee) => {
    setSelectedDeveloper(dev);
    setIsFormDialogOpen(true);
  };

  const onFormSuccess = () => {
    setIsFormDialogOpen(false);
    setSelectedDeveloper(null);
    fetchDevelopersAndAttendance(currentMonth); // Refresh data
  }
  
  const developerStats = useMemo(() => {
    const daysInCurrentMonth = getDaysInMonth(currentMonth);
    const workingDaysInMonth = daysInCurrentMonth - FREE_LEAVE_DAYS;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return developers.map(dev => {
      const devLeaves = attendances.filter(a => a.developerId === dev.id);
      const leaveDays = devLeaves.length;
      const extraLeaveDays = Math.max(0, leaveDays - FREE_LEAVE_DAYS);
      
      const monthlySalary = dev.salary || 0;
      // Calculate daily wage without rounding
      const dailyWage = monthlySalary > 0 && workingDaysInMonth > 0 ? monthlySalary / workingDaysInMonth : 0;
      // Calculate total deduction without rounding
      const salaryDeduction = extraLeaveDays * dailyWage;
      
      // Calculate final salary without rounding
      const finalSalary = monthlySalary - salaryDeduction;

      const leaveDateObjects = devLeaves.map(l => {
          const parsed = parseISO(l.leaveDate);
          return isValid(parsed) ? parsed : null;
      }).filter((d): d is Date => d !== null);

      const monthlyAttendance = allDaysInMonth.map(day => {
          const isLeave = leaveDateObjects.some(leaveDate => isSameDay(day, leaveDate));
          return {
              date: day,
              isLeave: isLeave,
          };
      });

      return {
        ...dev,
        leaveDays,
        extraLeaveDays,
        salaryDeduction, // Keep as precise number
        finalSalary, // Keep as precise number
        monthlyAttendance
      };
    });
  }, [developers, attendances, currentMonth]);

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Code2 className="mr-3 h-8 w-8 text-primary" />
          Developer Attendance
        </h1>
        <div className="flex items-center gap-2">
            <Label htmlFor="month-picker">Month</Label>
            <Input
                id="month-picker"
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={(e) => setCurrentMonth(new Date(e.target.value))}
                className="w-[180px]"
            />
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Monthly Leave Summary</CardTitle>
          <CardDescription>
            Track monthly leave for each developer. Each developer is allowed {FREE_LEAVE_DAYS} leave days per month.
            Exceeding this will result in a salary deduction based on their daily wage for the selected month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {developerStats.map(dev => (
                <Card key={dev.id} className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-lg flex items-center"><User className="mr-2 h-5 w-5 text-muted-foreground" />{dev.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <DollarSign className="mr-2 h-4 w-4"/> Base Salary: {dev.salary ? formatCurrency(dev.salary) : 'N/A'}
                      </p>
                      <p className={cn("text-sm font-semibold flex items-center", dev.salaryDeduction > 0 ? "text-destructive" : "text-green-600")}>
                        <Wallet className="mr-2 h-4 w-4"/> Total Salary: {dev.finalSalary ? formatCurrency(Math.round(dev.finalSalary)) : 'N/A'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-2">
                      <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{dev.leaveDays}</p>
                            <p className="text-xs text-muted-foreground">Leave Days</p>
                          </div>
                          <div className="text-center">
                            <p className={cn("text-2xl font-bold", dev.extraLeaveDays > 0 ? 'text-destructive' : 'text-foreground')}>{dev.extraLeaveDays}</p>
                            <p className="text-xs text-muted-foreground">Extra Days</p>
                          </div>
                      </div>
                      {dev.salaryDeduction > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1.5">
                            <DollarSign className="h-3 w-3"/>Deduct: {formatCurrency(Math.round(dev.salaryDeduction))}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="border-t my-3"></div>
                  <div className="flex justify-between items-start">
                     <div className="flex flex-wrap gap-1.5 flex-grow">
                        {dev.monthlyAttendance.length > 0 ? dev.monthlyAttendance.map(day => (
                            <Badge key={day.date.toString()} variant={day.isLeave ? "secondary" : "default"} className={cn("font-mono flex items-center gap-1", day.isLeave ? "" : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200")}>
                               {day.isLeave ? <X className="h-3 w-3"/> : <Check className="h-3 w-3"/>}
                               {format(day.date, 'dd')}
                            </Badge>
                        )) : <p className="text-xs text-muted-foreground">No attendance data for this month.</p>}
                     </div>
                     {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => handleAddLeaveClick(dev)} className="ml-4 flex-shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Leave
                        </Button>
                     )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedDeveloper && (
        <LeaveFormDialog 
            isOpen={isFormDialogOpen}
            onOpenChange={setIsFormDialogOpen}
            developer={selectedDeveloper}
            onSuccess={onFormSuccess}
        />
      )}
    </div>
  );
}

// Add Leave Form Dialog Component
interface LeaveFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  developer: Employee;
  onSuccess: () => void;
}

function LeaveFormDialog({ isOpen, onOpenChange, developer, onSuccess }: LeaveFormDialogProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(addDeveloperLeave, { message: null, success: false });

  const form = useForm<LeaveFormData>({
    resolver: zodResolver(ClientLeaveFormSchema),
    defaultValues: { leaveDate: '', reason: '' }
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success", description: state.message });
      form.reset();
      onSuccess();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.errors?._form?.[0] || state.message, variant: "destructive" });
    }
  }, [state, toast, form, onSuccess]);
  
  const onSubmit = (data: LeaveFormData) => {
    const formData = new FormData();
    formData.append('developerId', developer.id);
    formData.append('developerName', developer.name);
    formData.append('leaveDate', data.leaveDate);
    if (data.reason) formData.append('reason', data.reason);
    
    startTransition(() => formAction(formData));
  }

  return (
     <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add Leave for {developer.name}</DialogTitle>
                <DialogDescription>
                    Record a single day of leave for this developer.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div>
                    <Label htmlFor="leaveDate">Leave Date</Label>
                    <Input id="leaveDate" type="date" {...form.register('leaveDate')} />
                    {form.formState.errors.leaveDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.leaveDate.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea id="reason" {...form.register('reason')} placeholder="e.g., Sick leave, Personal matter" />
                    {form.formState.errors.reason && <p className="text-sm text-destructive mt-1">{form.formState.errors.reason.message}</p>}
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Leave Day
                    </Button>
                </div>
            </form>
        </DialogContent>
     </Dialog>
  );
}
