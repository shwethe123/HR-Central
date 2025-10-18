// src/app/(app)/developer-attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { addDeveloperLeave, deleteDeveloperLeave, addPublicHoliday, deletePublicHoliday, updateDeveloperLeave } from "./actions";
import { AddHolidayForm } from "./add-holiday-form";
import { Code2, PlusCircle, Loader2, Calendar, User, DollarSign, Wallet, Check, X, AlertTriangle, CalendarPlus, MoreHorizontal, Printer, MinusCircle, ArrowLeft, ArrowRight, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDaysInMonth, isBefore, isToday, addMonths, subMonths } from 'date-fns';
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
      details: DeveloperAttendance | PublicHoliday | undefined;
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

  const [leaveToEdit, setLeaveToEdit] = useState<DeveloperAttendance | null>(null);
  const [isEditLeaveFormDialogOpen, setIsEditLeaveFormDialogOpen] = useState(false);

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

  const handleDayClick = (dayStatus: 'WorkDay' | 'Leave' | 'Holiday', details: DeveloperAttendance | PublicHoliday | undefined) => {
    if (!isAdmin) return;
    if (dayStatus === 'Leave' && details && 'developerId' in details) {
        setLeaveToEdit(details as DeveloperAttendance);
        setIsEditLeaveFormDialogOpen(true);
    } else if (dayStatus === 'Holiday' && details) {
        setHolidayToDelete(details as PublicHoliday);
    }
  };


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

  const onEditLeaveFormSuccess = () => {
    setIsEditLeaveFormDialogOpen(false);
    setLeaveToEdit(null);
    fetchAllData(currentMonth);
  };
  
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
    const workingDaysInMonth = totalDaysInMonth; 
    
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
        let details: DeveloperAttendance | PublicHoliday | undefined = undefined;

        if (leaveRecord) {
            status = 'Leave';
            details = leaveRecord;
        } else if (holidayRecord) {
            status = 'Holiday';
            details = holidayRecord;
        }

        return {
            date: day,
            status: status,
            details: details,
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
        const printWindow = window.open('', '', 'height=700,width=800');
        printWindow?.document.write('<html><head><title>Salary Slip</title>');
        printWindow?.document.write(`<style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827; margin: 0; padding: 20px; background-color: #f9fafb; }
            @media print {
                body { padding: 0; background-color: #fff; }
                .no-print { display: none; }
                .slip-container { box-shadow: none; border: 1px solid #e5e7eb; }
            }
            .slip-container { width: 100%; max-width: 400px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-muted-foreground { color: #6b7280; }
            .text-foreground { color: #111827; }
            .text-primary { color: #3b82f6; }
            .text-destructive { color: #ef4444; }
            .text-green-600 { color: #16a34a; }
            .font-semibold { font-weight: 600; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .p-4 { padding: 1rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .gap-2 { gap: 0.5rem; }
            .grid { display: grid; }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .border-b { border-bottom-width: 1px; }
            .border-dashed { border-style: dashed; }
            .border-muted { border-color: #e5e7eb; }
            .rounded-md { border-radius: 0.375rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .bg-muted-50 { background-color: rgba(243, 244, 246, 0.5); }
            .bg-primary-10 { background-color: rgba(59, 130, 246, 0.1); }
            .w-full { width: 100%; }
            .inline-flex { display: inline-flex; }
            h3, p { margin: 0; }
            #logo { font-weight: 900; letter-spacing: -0.05em; font-size: 1.8rem; color: #2563eb; }
        </style>`);
        printWindow?.document.write('</head><body>');
        printWindow?.document.write(slipElement.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-muted/20 min-h-screen">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Developer Attendance</h1>
            <p className="text-muted-foreground mt-1">Manage monthly attendance, leaves, and salary deductions.</p>
          </div>
        </div>
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
            <div className="flex items-center rounded-md border bg-background">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}><ArrowLeft className="h-4 w-4" /></Button>
              <Input
                  id="month-picker"
                  type="month"
                  value={format(currentMonth, 'yyyy-MM')}
                  onChange={(e) => setCurrentMonth(new Date(e.target.value))}
                  className="w-[150px] border-0 rounded-none focus-visible:ring-0 text-center"
              />
              <Button variant="ghost" size="icon" onClick={goToNextMonth}><ArrowRight className="h-4 w-4" /></Button>
            </div>
        </div>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="xl:col-span-2 flex justify-center items-center py-20 bg-background rounded-lg">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
                developerStats.map(dev => (
                <Card key={dev.id} className="overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 bg-background border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <User className="h-9 w-9 text-muted-foreground bg-muted p-2 rounded-full" />
                        <div>
                        <p className="font-semibold text-lg">{dev.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4"/> Base Salary: {dev.salary ? formatCurrency(dev.salary) : 'N/A'}
                        </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem onSelect={() => handleAddLeaveClick(dev)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Leave
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAddDeductionClick(dev)}>
                            <MinusCircle className="mr-2 h-4 w-4" />
                            General Deduction
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleViewSalarySlipClick(dev)}>
                            <Printer className="mr-2 h-4 w-4" />
                            View Salary Slip
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 flex-grow">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Leave Details</p>
                            <div className="flex items-baseline gap-4">
                                <div className="text-left">
                                <p className="text-2xl font-bold">{dev.leaveDays}</p>
                                <p className="text-xs text-muted-foreground">Total Leave</p>
                                </div>
                                <div className="text-left">
                                <p className={cn("text-2xl font-bold", dev.extraLeaveDays > 0 ? 'text-destructive' : 'text-foreground')}>{dev.extraLeaveDays}</p>
                                <p className="text-xs text-muted-foreground">Extra</p>
                                </div>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Final Salary</p>
                            <p className={cn("text-2xl font-bold flex items-center", (dev.finalSalary ?? 0) < (dev.salary ?? 0) ? "text-destructive" : "text-green-600")}>
                                <Wallet className="mr-2 h-6 w-6"/> {dev.finalSalary ? formatCurrency(Math.round(dev.finalSalary)) : 'N/A'}
                            </p>
                        </div>
                         <div className="col-span-1 md:col-span-2 space-y-2">
                             <p className="text-sm font-medium text-muted-foreground">Deductions</p>
                             <div className="flex flex-col sm:flex-row gap-2">
                                <Badge variant="destructive" className="flex justify-between w-full sm:w-auto py-1 px-2">
                                    <span>Leave Deduction</span>
                                    <span className='font-mono ml-2'>{formatCurrency(Math.round(dev.salaryDeduction))}</span>
                                </Badge>
                                <Badge variant="secondary" className="flex justify-between w-full sm:w-auto py-1 px-2">
                                    <span>General Deduction</span>
                                    <span className='font-mono ml-2'>{formatCurrency(dev.generalDeduction)}</span>
                                </Badge>
                             </div>
                         </div>
                    </div>
                    <div className="p-4 border-t bg-background">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Monthly Attendance Calendar</p>
                      <div className="grid grid-cols-7 gap-1">
                          {dev.monthlyAttendance.map(day => {
                            const dayNumber = format(day.date, 'd');
                            let statusClass = 'bg-muted/40';
                            let content = null;
                            let title = format(day.date, "do MMMM");
                            let isClickable = isAdmin;

                            if (isBefore(day.date, new Date()) || isToday(day.date)) {
                                switch(day.status) {
                                    case 'Leave': 
                                        statusClass = "bg-destructive/10 border border-destructive/20 hover:bg-destructive/20";
                                        content = <X className="h-4 w-4 text-destructive" />;
                                        title = `Leave on ${title}. Click to edit/delete.`;
                                        if (isAdmin) statusClass += " cursor-pointer";
                                        break;
                                    case 'Holiday': 
                                        statusClass = "bg-primary/10 border border-primary/20 hover:bg-primary/20";
                                        content = <Calendar className="h-4 w-4 text-primary" />;
                                        title = `${(day.details as PublicHoliday)?.name} on ${title}. Click to delete.`;
                                         if (isAdmin) statusClass += " cursor-pointer";
                                        break;
                                    case 'WorkDay': 
                                    default:
                                        isClickable = false;
                                        statusClass = "bg-green-500/10 border border-green-500/20";
                                        content = <Check className="h-4 w-4 text-green-600" />;
                                        title = `Workday on ${title}`;
                                        break;
                                }
                            } else {
                                isClickable = false;
                            }
                            return (
                                <div key={day.date.toString()} 
                                    className={cn("h-10 rounded-md flex flex-col items-center justify-center relative transition-colors", statusClass, isClickable && "cursor-pointer")}
                                    title={title}
                                    onClick={() => isClickable && handleDayClick(day.status, day.details)}>
                                <span className="absolute top-0.5 right-1 text-[10px] text-muted-foreground">{dayNumber}</span>
                                {content}
                                </div>
                            )
                          })}
                      </div>
                    </div>
                </Card>
                ))
            )}
        </div>
        <aside className="lg:col-span-1 space-y-6">
            <Card className='shadow-sm'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/> Financial Overview</CardTitle>
                <CardDescription>Total salary payout for {format(currentMonth, 'MMMM yyyy')}.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">{formatCurrency(Math.round(totalFinalSalary))}</p>
              </CardContent>
            </Card>
        </aside>
      </main>
      
      {selectedDeveloper && (
        <LeaveFormDialog 
            isOpen={isLeaveFormDialogOpen}
            onOpenChange={setIsLeaveFormDialogOpen}
            developer={selectedDeveloper}
            onSuccess={onLeaveFormSuccess}
        />
      )}

       {leaveToEdit && (
        <EditLeaveFormDialog
          isOpen={isEditLeaveFormDialogOpen}
          onOpenChange={setIsEditLeaveFormDialogOpen}
          leave={leaveToEdit}
          onSuccess={onEditLeaveFormSuccess}
          onDelete={() => {
            setIsEditLeaveFormDialogOpen(false);
            handleUnleaveClick(leaveToEdit.developerName, leaveToEdit.id);
          }}
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
  
  useEffect(() => {
    if (isOpen) {
        setLeaveDate('');
        setReason('');
    }
  }, [isOpen]);

  return (
     <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add Leave for {developer.name}</DialogTitle>
                <DialogDescription>
                    Record a single day of leave. This will affect salary calculations if it exceeds the free leave allowance.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="leaveDate">Leave Date</Label>
                    <Input id="leaveDate" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Sick leave, Personal matter" />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Leave
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
     </Dialog>
  );
}


// Edit Leave Form Dialog Component
interface EditLeaveFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leave: DeveloperAttendance;
  onSuccess: () => void;
  onDelete: () => void;
}

function EditLeaveFormDialog({ isOpen, onOpenChange, leave, onSuccess, onDelete }: EditLeaveFormDialogProps) {
  const { toast } = useToast();
  const [leaveDate, setLeaveDate] = useState(leave.leaveDate);
  const [reason, setReason] = useState(leave.reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLeaveDate(leave.leaveDate);
      setReason(leave.reason || '');
    }
  }, [isOpen, leave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) {
      toast({ title: "Error", description: "Leave date is required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await updateDeveloperLeave({
      attendanceId: leave.id,
      newLeaveDate: leaveDate,
      newReason: reason,
    });
    
    if (result.success) {
      toast({ title: "Success", description: result.message });
      onSuccess();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Leave for {leave.developerName}</DialogTitle>
          <DialogDescription>
            Update the leave date or reason.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="editLeaveDate">Leave Date</Label>
            <Input id="editLeaveDate" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editReason">Reason (Optional)</Label>
            <Textarea id="editReason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Sick leave, Personal matter" />
          </div>
          <DialogFooter className="justify-between">
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete Leave
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
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

  const DetailRow = ({ label, value, isNegative = false, isBold = false }: { label: string, value: string | number, isNegative?: boolean, isBold?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
        <p className={cn("text-sm text-muted-foreground", isBold && "font-semibold text-foreground")}>{label}</p>
        <p className={cn("font-mono font-medium", isNegative ? "text-destructive" : "text-foreground", isBold && "font-bold")}>
            {typeof value === 'number' ? formatCurrency(value) : value}
        </p>
    </div>
  );

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Salary Slip</DialogTitle>
                  <DialogDescription>
                      Salary details for {devStats.name} - {format(month, 'MMMM yyyy')}.
                  </DialogDescription>
              </DialogHeader>
              
              <div ref={slipRef} className="p-4 sm:p-6 rounded-lg border bg-background slip-container">
                  <div className="text-center pb-4">
                      <h3 id="logo" className='text-2xl font-black tracking-tighter text-primary'>waansaung</h3>
                      <p className="text-lg font-semibold mt-4">{devStats.name}</p>
                      <p className="text-sm text-muted-foreground">Salary for {format(month, 'MMMM yyyy')}</p>
                      {devStats.paymentInfo && (
                        <div className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-2 bg-muted px-2 py-1 rounded">
                            <Wallet className="h-3 w-3" /> 
                            <span>{devStats.paymentInfo}</span>
                        </div>
                      )}
                  </div>
                  <Separator className="my-4" />

                  <div className="mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 text-center">Attendance Summary</h4>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                          <div className="p-2 bg-muted-50 rounded-md">
                              <p className="text-2xl font-bold">{devStats.leaveDays}</p>
                              <p className="text-xs text-muted-foreground">Total Leave</p>
                          </div>
                          <div className="p-2 bg-muted-50 rounded-md">
                              <p className="text-2xl font-bold">{FREE_LEAVE_DAYS}</p>
                              <p className="text-xs text-muted-foreground">Allowed</p>
                          </div>
                          <div className="p-2 bg-muted-50 rounded-md">
                              <p className={cn("text-2xl font-bold", devStats.extraLeaveDays > 0 && "text-destructive")}>
                                {devStats.extraLeaveDays}
                              </p>
                              <p className="text-xs text-muted-foreground">Extra Days</p>
                          </div>
                      </div>
                  </div>
                  <Separator className="my-4" />

                  <div className="mt-4 grid grid-cols-1 gap-y-4">
                      <div className="space-y-1">
                          <div className="flex items-center gap-2 text-foreground">
                              <h4 className="font-semibold">Salary Calculation</h4>
                          </div>
                          <DetailRow label="Base Salary" value={devStats.salary || 0} />
                          <DetailRow label="Leave Deduction" value={-Math.round(devStats.salaryDeduction)} isNegative />
                          <DetailRow label="General Deduction" value={-devStats.generalDeduction} isNegative />
                          <DetailRow label="Deduction/Day" value={Math.round(devStats.dailyWage)} />
                      </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                      <div className="bg-primary/10 p-4 rounded-lg flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">Net Payable Salary</p>
                          <p className="text-2xl font-bold text-primary font-mono">
                              {formatCurrency(Math.round(devStats.finalSalary))}
                          </p>
                      </div>
                  </div>
              </div>

              <DialogFooter className="mt-6 no-print">
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
