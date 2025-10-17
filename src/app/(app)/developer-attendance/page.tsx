// src/app/(app)/developer-attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useActionState, startTransition, useRef } from 'react';
import type { Employee, DeveloperAttendance, PublicHoliday } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { addDeveloperLeave, deleteDeveloperLeave, addPublicHoliday, deletePublicHoliday } from "./actions";
import { AddHolidayForm } from "./add-holiday-form";
import { Code2, PlusCircle, Loader2, Calendar, User, DollarSign, Wallet, Check, X, AlertTriangle, CalendarPlus, MoreHorizontal, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, eachDayOfInterval, isSameDay, parseISO, isValid, startOfMonth, endOfMonth, getDaysInMonth, isBefore, isToday, isWeekend } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';

const FREE_LEAVE_DAYS = 4;

const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return amount.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
};

// Define the type for the stats object
type DeveloperStats = Employee & {
  leaveDays: number;
  extraLeaveDays: number;
  salaryDeduction: number;
  generalDeduction: number;
  finalSalary: number;
  dailyWage: number;
  monthlyAttendance: {
      date: Date;
      status: "WorkDay" | "Leave" | "Holiday";
      id: string | undefined;
      holidayDetails: PublicHoliday | undefined;
  }[];
};


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

  const [isDeductionDialogOpen, setIsDeductionDialogOpen] = useState(false);
  const [developerForDeduction, setDeveloperForDeduction] = useState<Employee | null>(null);

  const [generalDeductions, setGeneralDeductions] = useState<Record<string, number>>({});
  
  const [isSalarySlipDialogOpen, setIsSalarySlipDialogOpen] = useState(false);
  const [developerForSalarySlip, setDeveloperForSalarySlip] = useState<DeveloperStats | null>(null);
  const salarySlipRef = useRef<HTMLDivElement>(null);


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
      setAttendances(fetchedAttendances);
      setHolidays(fetchedHolidays);

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

  const handleAddDeductionClick = (dev: Employee) => {
    setDeveloperForDeduction(dev);
    setIsDeductionDialogOpen(true);
  };
  
  const handleViewSalarySlipClick = (devStats: DeveloperStats) => {
    setDeveloperForSalarySlip(devStats);
    setIsSalarySlipDialogOpen(true);
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
    fetchAllData(currentMonth);
  }
  
  const onHolidayFormSuccess = () => {
    setIsHolidayFormDialogOpen(false);
    fetchAllData(currentMonth);
  }

  const onDeductionSave = (developerId: string, amount: number) => {
    setGeneralDeductions(prev => ({ ...prev, [developerId]: amount }));
    toast({ title: "Deduction Saved", description: `General deduction of ${formatCurrency(amount)} saved.`});
    setIsDeductionDialogOpen(false);
    setDeveloperForDeduction(null);
  };
  
  const developerStats: DeveloperStats[] = useMemo(() => {
    const totalDaysInMonth = getDaysInMonth(currentMonth);
    const workingDaysInMonth = totalDaysInMonth - 4; // As per user request
    
    return developers.map(dev => {
      const devLeaves = attendances.filter(a => a.developerId === dev.id);
      
      const leaveDaysCount = devLeaves.length;
      
      const extraLeaveDays = Math.max(0, leaveDaysCount - FREE_LEAVE_DAYS);
      
      const monthlySalary = dev.salary || 0;
      const dailyWage = monthlySalary > 0 && workingDaysInMonth > 0 ? monthlySalary / workingDaysInMonth : 0;
      const salaryDeduction = extraLeaveDays * dailyWage;
      
      const generalDeductionAmount = generalDeductions[dev.id] || 0;
      const finalSalary = monthlySalary - salaryDeduction - generalDeductionAmount;

      const allDaysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

      const monthlyAttendance = allDaysInMonth.map(day => {
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
        dailyWage,
        monthlyAttendance
      };
    });
  }, [developers, attendances, publicHolidays, currentMonth, generalDeductions]);

  const totalFinalSalary = useMemo(() => {
    return developerStats.reduce((total, dev) => total + (dev.finalSalary || 0), 0);
  }, [developerStats]);

  const handlePrintSlip = () => {
    const slipElement = salarySlipRef.current;
    if (slipElement) {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow?.document.write('<html><head><title>Salary Slip</title>');
        printWindow?.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } .text-right { text-align: right; } .font-bold { font-weight: bold; } .bg-gray-100 { background-color: #f3f4f6; }</style>');
        printWindow?.document.write('</head><body>');
        printWindow?.document.write(slipElement.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
    }
  };

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
            Each developer is allowed {FREE_LEAVE_DAYS} leave days per month. Exceeding this will result in salary deduction.
          </CardDescription>
           <div className="pt-2">
            <p className="text-lg font-semibold flex items-center text-green-600">
              <DollarSign className="mr-2 h-5 w-5"/>
              Total Final Salary for {format(currentMonth, 'MMMM')}: {formatCurrency(Math.round(totalFinalSalary))}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {developerStats.map(dev => (
                <Card key={dev.id} className="p-4 relative">
                   {isAdmin && (
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleViewSalarySlipClick(dev)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            View Salary Slip
                          </DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => handleAddLeaveClick(dev)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Leave
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleAddDeductionClick(dev)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            General Deduction
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                      <p className="font-semibold text-lg flex items-center"><User className="mr-2 h-5 w-5 text-muted-foreground" />{dev.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <DollarSign className="mr-2 h-4 w-4"/> Base Salary: {dev.salary ? formatCurrency(dev.salary) : 'N/A'}
                      </p>
                       <Badge variant="destructive" className="flex items-center gap-1.5 max-w-fit"
                          style={{ visibility: dev.generalDeduction > 0 ? 'visible' : 'hidden' }}>
                           <DollarSign className="h-3 w-3"/>Deduct (General): {formatCurrency(dev.generalDeduction)}
                       </Badge>
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
                        <p className={cn("text-lg font-semibold flex items-center", (dev.finalSalary ?? 0) < (dev.salary ?? 0) ? "text-destructive" : "text-green-600")}>
                            <Wallet className="mr-2 h-4 w-4"/> Final Salary: {dev.finalSalary ? formatCurrency(Math.round(dev.finalSalary)) : 'N/A'}
                        </p>
                    </div>
                  </div>
                  <div className="border-t my-3"></div>
                  <div className="flex justify-between items-start">
                     <div className="flex flex-wrap gap-1.5 flex-grow">
                        {dev.monthlyAttendance.length > 0 ? dev.monthlyAttendance.map(day => {
                            const today = new Date();
                            if (isBefore(day.date, today) || isToday(day.date)) {
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
                            }
                            return null;
                        }) : <p className="text-xs text-muted-foreground">No attendance data for this month interval.</p>}
                     </div>
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

      {developerForDeduction && (
        <DeductionFormDialog
          isOpen={isDeductionDialogOpen}
          onOpenChange={setIsDeductionDialogOpen}
          developer={developerForDeduction}
          currentDeduction={generalDeductions[developerForDeduction.id] || 0}
          onSave={onDeductionSave}
        />
      )}

      {developerForSalarySlip && (
         <SalarySlipDialog
            isOpen={isSalarySlipDialogOpen}
            onOpenChange={setIsSalarySlipDialogOpen}
            devStats={developerForSalarySlip}
            month={currentMonth}
            onPrint={handlePrintSlip}
            slipRef={salarySlipRef}
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
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) {
      toast({ title: "Error", description: "Leave date is required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addDeveloperLeave({
        developerId: developer.id,
        leaveDate: leaveDate,
        reason: reason
    });
    
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setLeaveDate('');
      setReason('');
      onSuccess();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  }
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
        setLeaveDate('');
        setReason('');
    }
  }, [isOpen]);

  function SubmitButton() {
      return (
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div>
                    <Label htmlFor="leaveDate">Leave Date</Label>
                    <Input id="leaveDate" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required />
                </div>
                 <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Sick leave, Personal matter" />
                </div>
                <div className="flex justify-end">
                    <SubmitButton />
                </div>
            </form>
        </DialogContent>
     </Dialog>
  );
}

// Deduction Form Dialog Component
interface DeductionFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  developer: Employee;
  currentDeduction: number;
  onSave: (developerId: string, amount: number) => void;
}

function DeductionFormDialog({ isOpen, onOpenChange, developer, currentDeduction, onSave }: DeductionFormDialogProps) {
    const [amount, setAmount] = useState(currentDeduction);

    useEffect(() => {
        setAmount(currentDeduction);
    }, [currentDeduction, isOpen]);

    const handleSave = () => {
        onSave(developer.id, amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>General Deduction for {developer.name}</DialogTitle>
                    <DialogDescription>
                        Enter any general salary deductions for this month. This is separate from leave-based deductions.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label htmlFor="deductionAmount">Deduction Amount (အထွေထွေဖြတ်ငွေ)</Label>
                    <Input
                        id="deductionAmount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Deduction</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Salary Slip Dialog Component
interface SalarySlipDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  devStats: DeveloperStats | null;
  month: Date;
  onPrint: () => void;
  slipRef: React.RefObject<HTMLDivElement>;
}

function SalarySlipDialog({ isOpen, onOpenChange, devStats, month, onPrint, slipRef }: SalarySlipDialogProps) {
  if (!devStats) return null;

  const DetailRow = ({ label, value, isBold = false, isTotal = false }: { label: string, value: string | number, isBold?: boolean, isTotal?: boolean }) => (
    <div className={cn("flex justify-between py-2", !isTotal && "border-b border-dashed")}>
        <p className={cn(isBold ? "font-semibold" : "text-muted-foreground")}>{label}</p>
        <p className={cn("font-mono", isBold ? "font-bold" : "")}>
            {typeof value === 'number' ? formatCurrency(value) : value}
        </p>
    </div>
  );

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Salary Slip</DialogTitle>
                  <DialogDescription>
                      Detailed salary breakdown for {devStats.name} for {format(month, 'MMMM yyyy')}.
                  </DialogDescription>
              </DialogHeader>
              <div ref={slipRef} className="space-y-4 p-4 rounded-md border bg-muted/50">
                  <h3 className="font-bold text-center text-lg">{devStats.name}</h3>
                  <p className="text-center text-sm text-muted-foreground -mt-3">{format(month, 'MMMM yyyy')}</p>
                  {devStats.paymentInfo && (
                    <p className="text-center text-sm text-muted-foreground -mt-2 flex items-center justify-center gap-2">
                        <Wallet className="h-4 w-4" /> <span>{devStats.paymentInfo}</span>
                    </p>
                  )}
                  
                  <Separator />
                  <DetailRow label="Base Salary" value={devStats.salary || 0} isBold={true} />
                  <Separator />

                  <p className="text-sm font-semibold pt-2">Attendance</p>
                  <DetailRow label="Total Leave Days" value={devStats.leaveDays} />
                  <DetailRow label="Allowed Leave Days" value={FREE_LEAVE_DAYS} />
                  <DetailRow label="Extra Leave Days" value={devStats.extraLeaveDays} />
                  
                  <Separator />
                  <p className="text-sm font-semibold pt-2">Deductions</p>
                  <DetailRow label="Deduction per Day" value={Math.round(devStats.dailyWage)} />
                  <DetailRow label="Leave Deduction" value={-Math.round(devStats.salaryDeduction)} />
                  <DetailRow label="General Deduction" value={-devStats.generalDeduction} />
                  
                  <Separator className="my-4"/>
                  
                  <div className="bg-background p-3 rounded-md">
                    <DetailRow label="Final Salary" value={Math.round(devStats.finalSalary)} isBold={true} isTotal={true}/>
                  </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button onClick={onPrint}><Printer className="mr-2 h-4 w-4"/> Print Slip</Button>
              </DialogFooter>
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
