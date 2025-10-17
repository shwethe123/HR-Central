// src/app/(app)/developer-attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { Employee, DeveloperAttendance, PublicHoliday } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addDeveloperLeave, deleteDeveloperLeave, type AddDeveloperLeaveState, addPublicHoliday, deletePublicHoliday } from "./actions";
import { AddHolidayForm } from "./add-holiday-form";
import { Code2, PlusCircle, Loader2, Calendar, User, DollarSign, Wallet, Check, X, AlertTriangle, CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth, parseISO, isValid, isSameMonth, isBefore, isWeekend } from 'date-fns';
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
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
};

const ClientLeaveFormSchema = z.object({
  leaveDate: z.string().min(1, { message: "Leave date is required." }),
  reason: z.string().max(500).optional(),
});
type LeaveFormData = z.infer<typeof ClientLeaveFormSchema>;

export default function DeveloperAttendancePage() {
  const [developers, setDevelopers] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<DeveloperAttendance[]>([]);
  const [publicHolidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Employee | null>(null);
  const [isLeaveFormDialogOpen, setIsLeaveFormDialogOpen] = useState(false);
  const [isHolidayFormDialogOpen, setIsHolidayFormDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [leaveToDelete, setLeaveToDelete] = useState<{devName: string, attendanceId: string} | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<PublicHoliday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [generalDeductions, setGeneralDeductions] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchAllData = useCallback(async (month: Date) => {
    setIsLoading(true);
    try {
      const developersQuery = query(collection(db, "developers"));
      const holidaysQuery = query(collection(db, "publicHolidays"));
      
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      
      const attendanceQuery = query(
        collection(db, "developerAttendances"),
        where('leaveDate', '>=', monthStart),
        where('leaveDate', '<=', monthEnd)
      );
      
      const [devSnapshot, attSnapshot, holidaysSnapshot] = await Promise.all([
        getDocs(developersQuery),
        getDocs(attendanceQuery),
        getDocs(holidaysQuery),
      ]);

      const fetchedDevelopers: Employee[] = devSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      const fetchedAttendances: DeveloperAttendance[] = attSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeveloperAttendance));
      const fetchedHolidays: PublicHoliday[] = holidaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicHoliday));
      
      setDevelopers(fetchedDevelopers);
      setAttendances([...fetchedAttendances]);
      setHolidays([...fetchedHolidays]);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch developer, attendance, or holiday data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData(currentMonth);
  }, [currentMonth, fetchAllData]);
  
  const handleAddLeaveClick = (dev: Employee) => {
    setSelectedDeveloper(dev);
    setIsLeaveFormDialogOpen(true);
  };
  
  const handleUnleaveClick = (devName: string, attendanceId: string) => {
    if (!isAdmin) return;
    setLeaveToDelete({ devName, attendanceId });
  };
  
  const handleHolidayClick = (holiday: PublicHoliday) => {
     if (!isAdmin) return;
     setHolidayToDelete(holiday);
  }

  const handleDeleteLeaveConfirm = async () => {
    if (!leaveToDelete) return;
    setIsDeleting(true);
    const result = await deleteDeveloperLeave(leaveToDelete.attendanceId);
    if (result.success) {
        toast({ title: 'Success', description: result.message ?? `Leave day for ${leaveToDelete.devName} removed.` });
        await fetchAllData(currentMonth); 
    } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setLeaveToDelete(null);
    setIsDeleting(false);
  };
  
  const handleDeleteHolidayConfirm = async () => {
    if (!holidayToDelete) return;
    setIsDeleting(true);
    const result = await deletePublicHoliday(holidayToDelete.id);
    if (result.success) {
        toast({ title: "Holiday Removed", description: result.message});
        await fetchAllData(currentMonth);
    } else {
        toast({ title: "Error", description: result.message, variant: 'destructive' });
    }
    setHolidayToDelete(null);
    setIsDeleting(false);
  }

  const onLeaveFormSuccess = () => {
    setIsLeaveFormDialogOpen(false);
    setSelectedDeveloper(null);
    fetchAllData(currentMonth); // Refresh data
  }
  
  const onHolidayFormSuccess = () => {
    setIsHolidayFormDialogOpen(false);
    fetchAllData(currentMonth); // Refresh data
  }

  const handleGeneralDeductionChange = (developerId: string, amount: string) => {
    const numericAmount = Number(amount.replace(/,/g, '')) || 0;
    setGeneralDeductions(prev => ({ ...prev, [developerId]: numericAmount }));
  };
  
  const developerStats = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    
    const displayIntervalEnd = isSameMonth(currentMonth, today) && isBefore(today, lastDayOfMonth) 
      ? today 
      : lastDayOfMonth;

    const allDaysInDisplayInterval = eachDayOfInterval({ start: monthStart, end: displayIntervalEnd });
    
    const holidayDateStrings = publicHolidays.map(h => h.date);

    const totalDaysInMonth = getDaysInMonth(currentMonth);
    const workingDaysInMonth = totalDaysInMonth - 4; 

    return developers.map(dev => {
      
      const devLeaves = attendances.filter(leave => leave.developerId === dev.id);

      const leaveDaysCount = devLeaves.filter(leave => {
        const isHoliday = holidayDateStrings.includes(leave.leaveDate);
        return !isHoliday;
      }).length;
      
      const extraLeaveDays = Math.max(0, leaveDaysCount - FREE_LEAVE_DAYS);
      
      const monthlySalary = dev.salary || 0;
      const dailyWage = monthlySalary > 0 && workingDaysInMonth > 0 ? monthlySalary / workingDaysInMonth : 0;
      const salaryDeduction = extraLeaveDays * dailyWage;
      
      const generalDeductionAmount = generalDeductions[dev.id] || 0;
      const finalSalary = monthlySalary - salaryDeduction - generalDeductionAmount;

      const monthlyAttendance = allDaysInDisplayInterval.map(day => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        
        const leaveRecord = devLeaves.find(leave => leave.leaveDate === formattedDay);
        const holidayRecord = publicHolidays.find(h => h.date === formattedDay);

        let status: 'WorkDay' | 'Leave' | 'Holiday' = 'WorkDay';
        if (leaveRecord) {
            status = 'Leave';
        } else if (holidayRecord) {
            status = 'Holiday';
        }

        return {
            date: day,
            status: status,
            id: leaveRecord?.id || holidayRecord?.id,
            holidayDetails: holidayRecord,
        };
      });

      return {
        ...dev,
        leaveDays: leaveDaysCount,
        extraLeaveDays,
        salaryDeduction,
        generalDeduction: generalDeductionAmount,
        finalSalary,
        monthlyAttendance
      };
    });
  }, [developers, attendances, publicHolidays, currentMonth, generalDeductions]);

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Code2 className="mr-3 h-8 w-8 text-primary" />
          Developer Attendance
        </h1>
        <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog open={isHolidayFormDialogOpen} onOpenChange={setIsHolidayFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><CalendarPlus className="mr-2 h-4 w-4"/> Add Holiday</Button>
                </DialogTrigger>
                <HolidayFormDialog 
                    isOpen={isHolidayFormDialogOpen}
                    onOpenChange={setIsHolidayFormDialogOpen}
                    onSuccess={onHolidayFormSuccess}
                />
              </Dialog>
            )}
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
            Exceeding this will result in a salary deduction.
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                      <p className="font-semibold text-lg flex items-center"><User className="mr-2 h-5 w-5 text-muted-foreground" />{dev.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <DollarSign className="mr-2 h-4 w-4"/> Base Salary: {dev.salary ? formatCurrency(dev.salary) : 'N/A'}
                      </p>
                      <p className={cn("text-sm font-semibold flex items-center", dev.finalSalary < dev.salary ? "text-destructive" : "text-green-600")}>
                        <Wallet className="mr-2 h-4 w-4"/> Final Salary: {dev.finalSalary ? formatCurrency(Math.round(dev.finalSalary)) : 'N/A'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-start sm:items-end lg:items-start gap-2 lg:col-span-1">
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
                       <Badge variant="destructive" className="flex items-center gap-1.5"
                          style={{ visibility: dev.salaryDeduction > 0 ? 'visible' : 'hidden' }}>
                           <DollarSign className="h-3 w-3"/>Deduct (Leave): {formatCurrency(Math.round(dev.salaryDeduction))}
                       </Badge>
                    </div>
                    <div className="lg:col-span-1">
                      <Label htmlFor={`general-deduction-${dev.id}`} className="text-xs text-muted-foreground">General Deduction (အထွေထွေဖြတ်ငွေ)</Label>
                      <Input
                        id={`general-deduction-${dev.id}`}
                        type="text"
                        placeholder="0"
                        className="h-9 mt-1"
                        value={generalDeductions[dev.id] ? formatCurrency(generalDeductions[dev.id]) : ''}
                        onChange={(e) => handleGeneralDeductionChange(dev.id, e.target.value)}
                      />
                       <Badge variant="destructive" className="mt-2 flex items-center gap-1.5"
                           style={{ visibility: dev.generalDeduction > 0 ? 'visible' : 'hidden' }}>
                           <DollarSign className="h-3 w-3"/>Deduct (General): {formatCurrency(dev.generalDeduction)}
                       </Badge>
                    </div>
                  </div>
                  <div className="border-t my-3"></div>
                  <div className="flex justify-between items-start">
                     <div className="flex flex-wrap gap-1.5 flex-grow">
                        {dev.monthlyAttendance.length > 0 ? dev.monthlyAttendance.map(day => {
                            const dayNumber = format(day.date, 'dd');
                            let badgeContent;
                            switch (day.status) {
                                case 'Leave':
                                    badgeContent = (
                                        <Badge
                                            key={`${dev.id}-${day.date.toString()}`}
                                            variant="destructive"
                                            className={cn(
                                                "font-mono flex items-center gap-1",
                                                isAdmin && "cursor-pointer hover:opacity-75"
                                            )}
                                            onClick={() => day.id && handleUnleaveClick(dev.name, day.id)}
                                            title={isAdmin ? `Remove leave for ${dev.name}` : "Leave Day"}
                                        >
                                            <X className="h-3 w-3"/>
                                            {dayNumber}
                                        </Badge>
                                    );
                                    break;
                                case 'Holiday':
                                    badgeContent = (
                                         <Badge 
                                            key={`${dev.id}-${day.date.toString()}`}
                                            variant="default"
                                            className={cn(
                                                "font-mono flex items-center gap-1 bg-black text-white border-black",
                                                isAdmin && "cursor-pointer hover:opacity-75"
                                            )}
                                            onClick={() => day.holidayDetails && handleHolidayClick(day.holidayDetails)}
                                            title={isAdmin ? `Remove Holiday: ${day.holidayDetails?.name}` : day.holidayDetails?.name}
                                          >
                                            <Calendar className="h-3 w-3"/>
                                            {dayNumber}
                                        </Badge>
                                    );
                                    break;
                                case 'WorkDay':
                                default:
                                    badgeContent = (
                                        <Badge key={`${dev.id}-${day.date.toString()}`} variant="default" className="font-mono flex items-center gap-1 bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
                                            <Check className="h-3 w-3"/>
                                            {dayNumber}
                                        </Badge>
                                    );
                                    break;
                            }
                            return badgeContent;
                        }) : <p className="text-xs text-muted-foreground">No attendance data for this month interval.</p>}
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
            isOpen={isLeaveFormDialogOpen}
            onOpenChange={setIsLeaveFormDialogOpen}
            developer={selectedDeveloper}
            onSuccess={onLeaveFormSuccess}
        />
      )}
      
      {/* Holiday Deletion Dialog */}
      <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertTriangle className="h-6 w-6 text-destructive" /> 
              Confirm Holiday Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the public holiday: <strong>{holidayToDelete?.name}</strong> on {holidayToDelete?.date}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHolidayToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHolidayConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {leaveToDelete && (
         <AlertDialog open={!!leaveToDelete} onOpenChange={(open) => !open && setLeaveToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className='flex items-center gap-2'>
                  <AlertTriangle className="h-6 w-6 text-destructive" /> 
                  Confirm Leave Removal
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this leave day for <strong>{leaveToDelete.devName}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setLeaveToDelete(null)} disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLeaveConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
    formData.append('leaveDate', data.leaveDate);
    if (data.reason) formData.append('reason', data.reason);
    
    startTransition(() => formAction(formData));
  }

  // We need to use `useFormStatus` from inside the form.
  function SubmitButton() {
      const { pending } = useFormStatus();
      return (
          <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Leave Day
          </Button>
      )
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
                    <SubmitButton />
                </div>
            </form>
        </DialogContent>
     </Dialog>
  );
}

// Add Holiday Form Dialog Component
interface HolidayFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function HolidayFormDialog({ isOpen, onOpenChange, onSuccess }: HolidayFormDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Public Holiday</DialogTitle>
                    <DialogDescription>
                        Record a new public holiday for all developers. This day will not be counted as a working day.
                    </DialogDescription>
                </DialogHeader>
                <AddHolidayForm onFormSubmissionSuccess={onSuccess} />
            </DialogContent>
        </Dialog>
    );
}
