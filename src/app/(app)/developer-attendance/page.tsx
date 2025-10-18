// src/app/(app)/developer-attendance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Employee, DeveloperAttendance, PublicHoliday } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Code2, PlusCircle, Loader2, Calendar, User, DollarSign, Wallet, Check, X, AlertTriangle, CalendarPlus, MoreHorizontal, Printer, MinusCircle, ArrowLeft, ArrowRight, Briefcase, CalendarX, UserCheck, UserX as UserXIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDaysInMonth, isBefore, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';

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
  totalDeduction: number;
  finalSalary: number;
  dailyWage: number;
  monthlyAttendance: {
      date: Date;
      status: "WorkDay" | "Leave" | "Holiday";
      details: DeveloperAttendance | PublicHoliday | undefined;
  }[];
};

// Main Component
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
      const totalDeduction = salaryDeduction + generalDeductionAmount;
      const finalSalary = monthlySalary - totalDeduction;

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

        return { date: day, status: status, details: details };
      });

      return {
        ...dev,
        leaveDays: leaveDaysCount,
        extraLeaveDays,
        salaryDeduction,
        generalDeduction: generalDeductionAmount,
        totalDeduction,
        finalSalary,
        dailyWage,
        monthlyAttendance
      };
    });
  }, [developers, attendances, publicHolidays, currentMonth, generalDeductions]);

  // Summary data for top cards
  const summaryData = useMemo(() => {
      const totalPayout = developerStats.reduce((total, dev) => total + dev.finalSalary, 0);
      const totalLeaves = developerStats.reduce((total, dev) => total + dev.leaveDays, 0);
      const totalSalary = developers.reduce((sum, dev) => sum + (dev.salary || 0), 0);
      const totalDeductions = developerStats.reduce((sum, dev) => sum + dev.totalDeduction, 0);
      return {
          payout: totalPayout,
          developerCount: developers.length,
          totalLeaves: totalLeaves,
          totalSalary: totalSalary,
          totalDeductions: totalDeductions,
      };
  }, [developerStats, developers]);

  const totalFinalSalary = useMemo(() => {
    return developerStats.reduce((sum, dev) => sum + dev.finalSalary, 0);
  }, [developerStats]);

  const handlePrintSlip = async () => {
    if (!developerForSalarySlip) return;
  
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54], // Credit card size
    });
  
    const cardWidth = 85.6;
    const cardHeight = 54;
    const margin = 4;
  
    const darkBlue = '#0A2240';
    const accentBlue = '#00AEEF';
    const white = '#FFFFFF';
    const lightGray = '#D3D3D3';
    const grayText = '#9CA3AF';
  
    doc.setFillColor(darkBlue);
    doc.rect(0, 0, cardWidth, cardHeight, 'F');
    
    const accentWidth = 28;
    doc.setFillColor(accentBlue);
    doc.rect(0, 0, accentWidth, cardHeight, 'F');
  
    const avatarSize = 20;
    const avatarX = (accentWidth - avatarSize) / 2;
    const avatarY = margin + 2;
  
    let avatarAdded = false;
    if (developerForSalarySlip.avatar) {
      try {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Important for CORS
  
        await new Promise<void>((resolve, reject) => {
          image.onload = () => {
            const imgProps = doc.getImageProperties(image);
            const imgWidth = avatarSize;
            const imgHeight = (avatarSize * imgProps.height) / imgProps.width;
            doc.addImage(image, 'PNG', avatarX, avatarY, imgWidth, imgHeight);
            avatarAdded = true;
            resolve();
          };
          image.onerror = (err) => {
            console.error(`Error loading image for PDF (URL: ${developerForSalarySlip.avatar}). Error:`, err);
            reject(err);
          };
          image.src = developerForSalarySlip.avatar;
        });
      } catch (e) {
        console.error(`Error processing image for PDF (URL: ${developerForSalarySlip.avatar}). Falling back to initials.`);
        avatarAdded = false; // Ensure fallback is used
      }
    }
  
    if (!avatarAdded) {
        const initials = developerForSalarySlip.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        doc.setFillColor(white);
        doc.circle(accentWidth / 2, avatarY + avatarSize / 2, avatarSize / 2, 'F');
        doc.setTextColor(darkBlue);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const initialsWidth = doc.getTextWidth(initials);
        doc.text(initials, (accentWidth - initialsWidth) / 2, avatarY + avatarSize / 2 + 3.5);
    }
    
    doc.setTextColor(white);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    const companyName = "waansaung";
    const companyNameWidth = doc.getTextWidth(companyName);
    doc.text(companyName, (accentWidth - companyNameWidth) / 2, avatarY + avatarSize + 8);
  
  
    const contentX = accentWidth + margin;
    let currentY = margin + 5;
    const contentWidth = cardWidth - contentX - margin;
  
    doc.setTextColor(white);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const nameLines = doc.splitTextToSize(developerForSalarySlip.name, contentWidth);
    nameLines.forEach((line, index) => {
        doc.text(line, contentX, currentY + (index * 4.5));
    });
    currentY += (nameLines.length * 5);
  
    doc.setTextColor(lightGray);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(developerForSalarySlip.role || 'Developer', contentX, currentY);
    currentY += 4;
  
    doc.setDrawColor(accentBlue);
    doc.setLineWidth(0.3);
    doc.line(contentX, currentY, cardWidth - margin, currentY);
    currentY += 4;
  
    doc.setFontSize(7.5);
    doc.setTextColor(grayText);
    const addDetail = (label: string, value: string) => {
      if (currentY < cardHeight - margin - 2) {
        doc.text(label, contentX, currentY);
        doc.setTextColor(white);
        doc.text(value, contentX + 15, currentY);
        doc.setTextColor(grayText);
        currentY += 4;
      }
    };
    
    addDetail("Phone:", developerForSalarySlip.phone || 'N/A');
    addDetail("Email:", developerForSalarySlip.email || 'N/A');
    
    if(developerForSalarySlip.paymentInfo) {
        addDetail("Account:", developerForSalarySlip.paymentInfo);
    }
  
    currentY += 1;
    doc.setDrawColor(accentBlue);
    doc.setLineWidth(0.3);
    doc.line(contentX, currentY, cardWidth - margin, currentY);
    currentY += 4;
  
    doc.setFontSize(8);
    doc.setTextColor(white);
    doc.setFont(undefined, 'bold');
    doc.text("Net Salary:", contentX, currentY);
    
    doc.setFontSize(10);
    doc.text(`${formatCurrency(Math.round(developerForSalarySlip.finalSalary))} MMK`, cardWidth - margin, currentY, { align: 'right' });
  
  
    doc.save(`SalarySlip_${developerForSalarySlip.name.replace(/\s+/g, '_')}_${format(currentMonth, 'MMM_yyyy')}.pdf`);
  };


  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Developer Attendance</h1>
            <p className="text-slate-500 mt-1">Monthly attendance, leave, and salary overview.</p>
        </div>
        <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog open={isHolidayFormDialogOpen} onOpenChange={setIsHolidayFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><CalendarPlus className="mr-2 h-4 w-4"/> Add Holiday</Button>
                </DialogTrigger>
                <HolidayFormDialog isOpen={isHolidayFormDialogOpen} onOpenChange={setIsHolidayFormDialogOpen} onSuccess={onHolidayFormSuccess} />
              </Dialog>
            )}
            <div className="flex items-center rounded-md border bg-white shadow-sm">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}><ArrowLeft className="h-4 w-4" /></Button>
              <div className="text-center font-semibold text-slate-700 w-40 py-2 border-x">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}><ArrowRight className="h-4 w-4" /></Button>
            </div>
        </div>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <span>Key metrics for the developer team for {format(currentMonth, 'MMMM yyyy')}.</span>
                <div className="flex items-center text-green-600 font-bold text-md mt-2 sm:mt-0">
                    <DollarSign className="h-5 w-5 mr-1"/>
                    Total Payout: {formatCurrency(Math.round(totalFinalSalary))}
                </div>
            </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={UserCheck} title="Total Developers" value={summaryData.developerCount} />
          <StatCard icon={DollarSign} title="Total Base Salary" value={formatCurrency(Math.round(summaryData.totalSalary))} />
          <StatCard icon={MinusCircle} title="Total Deductions" value={formatCurrency(Math.round(summaryData.totalDeductions))} color="text-destructive" />
          <StatCard icon={CalendarX} title="Total Leave Days" value={summaryData.totalLeaves} />
        </CardContent>
      </Card>

      <main className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-lg shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {developerStats.map(dev => (
              <DeveloperInfoCard 
                key={dev.id} 
                dev={dev} 
                isAdmin={isAdmin}
                onAddLeave={handleAddLeaveClick}
                onAddDeduction={handleAddDeductionClick}
                onViewSlip={handleViewSalarySlipClick}
                onDayClick={handleDayClick}
              />
            ))}
          </div>
        )}
      </main>

      {selectedDeveloper && <LeaveFormDialog isOpen={isLeaveFormDialogOpen} onOpenChange={setIsLeaveFormDialogOpen} developer={selectedDeveloper} onSuccess={onLeaveFormSuccess}/>}
      {leaveToEdit && <EditLeaveFormDialog isOpen={isEditLeaveFormDialogOpen} onOpenChange={setIsEditLeaveFormDialogOpen} leave={leaveToEdit} onSuccess={onEditLeaveFormSuccess} onDelete={() => { setIsEditLeaveFormDialogOpen(false); handleUnleaveClick(leaveToEdit.developerName, leaveToEdit.id); }} />}
      {developerForDeduction && <DeductionFormDialog isOpen={isDeductionDialogOpen} onOpenChange={setIsDeductionDialogOpen} developer={developerForDeduction} currentDeduction={generalDeductions[developerForDeduction.id] || 0} onSave={onDeductionSave} />}
      {developerForSalarySlip && <SalarySlipDialog isOpen={isSalarySlipDialogOpen} onOpenChange={setIsSalarySlipDialogOpen} devStats={developerForSalarySlip} month={currentMonth} onPrint={handlePrintSlip} slipRef={salarySlipRef}/>}
      
      <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'><AlertTriangle className="h-6 w-6 text-destructive" /> Confirm Holiday Removal</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove <strong>{holidayToDelete?.name}</strong> on {holidayToDelete?.date}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHolidayToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHolidayConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!leaveToDelete} onOpenChange={(open) => !open && setLeaveToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'><AlertTriangle className="h-6 w-6 text-destructive" /> Confirm Leave Removal</AlertDialogTitle>
            <AlertDialogDescription>Are you sure to remove this leave for <strong>{leaveToDelete?.devName}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaveToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLeaveConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const StatCard = ({ icon: Icon, title, value, color = "text-slate-800" }: { icon: React.ElementType, title: string, value: string | number, color?: string }) => (
    <div className="bg-slate-100/60 p-4 rounded-lg">
        <p className="text-sm text-slate-500 font-medium flex items-center gap-2"><Icon className="h-4 w-4" />{title}</p>
        <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
    </div>
);

const DeveloperInfoCard = ({ dev, isAdmin, onAddLeave, onAddDeduction, onViewSlip, onDayClick }) => {
    const firstDayOfMonth = getDay(startOfMonth(dev.monthlyAttendance[0].date)); 
    const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    return (
        <Card className="overflow-hidden shadow-sm flex flex-col bg-white transition-all hover:shadow-md">
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <User className="h-10 w-10 text-primary bg-primary/10 p-2 rounded-full" />
                    <div>
                        <p className="font-semibold text-lg text-slate-800">{dev.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5"><Briefcase className="h-4 w-4"/> {dev.role || 'Developer'}</p>
                    </div>
                </div>
                {isAdmin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem onSelect={() => onAddLeave(dev)}><PlusCircle className="mr-2 h-4 w-4" />Add Leave</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onAddDeduction(dev)}><MinusCircle className="mr-2 h-4 w-4" />General Deduction</DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onViewSlip(dev)}><Printer className="mr-2 h-4 w-4" />View Salary Slip</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="grid grid-cols-6 gap-px bg-slate-200 border-b">
                <StatItem icon={DollarSign} label="Base Salary" value={formatCurrency(dev.salary)} />
                <StatItem icon={MinusCircle} label="Deductions" value={formatCurrency(Math.round(dev.totalDeduction))} valueColor="text-destructive" />
                <StatItem icon={Wallet} label="Final Salary" value={formatCurrency(Math.round(dev.finalSalary))} valueColor={dev.finalSalary < (dev.salary||0) ? "text-destructive" : "text-green-600"} />
                <StatItem icon={CalendarX} label="Total Leave" value={dev.leaveDays} />
                <StatItem icon={UserCheck} label="Allowed" value={FREE_LEAVE_DAYS} />
                <StatItem icon={UserXIcon} label="Extra" value={dev.extraLeaveDays} valueColor={dev.extraLeaveDays > 0 ? "text-destructive" : "text-slate-700"} />
            </div>

            <div className="p-4 flex-grow">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                    {weekDays.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                    {dev.monthlyAttendance.map(day => {
                        const dayNumber = format(day.date, 'd');
                        let statusClass = 'bg-slate-50';
                        let isClickable = isAdmin;
                        let showStatus = false;

                        if (isBefore(day.date, new Date()) || isToday(day.date)) {
                           showStatus = true;
                            switch(day.status) {
                                case 'Leave': statusClass = "bg-red-100 text-red-700 hover:bg-red-200"; break;
                                case 'Holiday': statusClass = "bg-blue-100 text-blue-700 hover:bg-blue-200"; break;
                                default: isClickable = false; statusClass = "bg-green-100 text-green-700"; break;
                            }
                        } else {
                            isClickable = false;
                        }
                        
                        return (
                            <div key={day.date.toString()} 
                                className={cn("h-10 rounded-md flex items-center justify-center font-semibold text-sm transition-colors", showStatus ? statusClass : 'bg-slate-50 text-slate-400', isClickable && "cursor-pointer")}
                                onClick={() => isClickable && onDayClick(day.status, day.details)}>
                                {dayNumber}
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    );
};

const StatItem = ({ icon: Icon, label, value, valueColor = "text-slate-700" }) => (
    <div className="p-2 bg-white text-center">
        <Icon className="h-4 w-4 mx-auto text-slate-400 mb-1" />
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
        <p className={cn("text-sm font-bold", valueColor)}>{value}</p>
    </div>
);

function LeaveFormDialog({ isOpen, onOpenChange, developer, onSuccess }) {
    const { toast } = useToast();
    const [leaveDate, setLeaveDate] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { if (isOpen) { setLeaveDate(''); setReason(''); } }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!leaveDate) { toast({ title: "Error", description: "Leave date is required.", variant: "destructive" }); return; }
        setIsSubmitting(true);
        const result = await addDeveloperLeave({ developerId: developer.id, leaveDate, reason });
        if (result.success) { toast({ title: "Success", description: result.message }); onSuccess(); } 
        else { toast({ title: "Error", description: result.message, variant: "destructive" }); }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Add Leave for {developer.name}</DialogTitle><DialogDescription>Record a single day of leave.</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div><Label htmlFor="leaveDate">Leave Date</Label><Input id="leaveDate" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required /></div>
                    <div><Label htmlFor="reason">Reason (Optional)</Label><Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Sick leave" /></div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Leave</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditLeaveFormDialog({ isOpen, onOpenChange, leave, onSuccess, onDelete }) {
    const { toast } = useToast();
    const [leaveDate, setLeaveDate] = useState(leave.leaveDate);
    const [reason, setReason] = useState(leave.reason || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { if (isOpen) { setLeaveDate(leave.leaveDate); setReason(leave.reason || ''); } }, [isOpen, leave]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await updateDeveloperLeave({ attendanceId: leave.id, newLeaveDate: leaveDate, newReason: reason });
        if (result.success) { toast({ title: "Success", description: result.message }); onSuccess(); } 
        else { toast({ title: "Error", description: result.message, variant: "destructive" }); }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Edit Leave for {leave.developerName}</DialogTitle><DialogDescription>Update the leave date or reason.</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div><Label htmlFor="editLeaveDate">Leave Date</Label><Input id="editLeaveDate" type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required /></div>
                    <div><Label htmlFor="editReason">Reason (Optional)</Label><Textarea id="editReason" value={reason} onChange={e => setReason(e.target.value)} /></div>
                    <DialogFooter className="justify-between">
                        <Button type="button" variant="destructive" onClick={onDelete}>Delete Leave</Button>
                        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button></div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeductionFormDialog({ isOpen, onOpenChange, developer, currentDeduction, onSave }) {
    const [amount, setAmount] = useState(currentDeduction);
    useEffect(() => { setAmount(currentDeduction); }, [currentDeduction, isOpen]);
    
    const handleSave = () => {
        onSave(developer.id, amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>General Deduction for {developer.name}</DialogTitle>
                    <DialogDescription>Enter any general salary deductions for this month.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="deductionAmount">Deduction Amount (အထွေထွေဖြတ်ငွေ)</Label>
                    <Input id="deductionAmount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0"/>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Deduction</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function HolidayFormDialog({ isOpen, onOpenChange, onSuccess }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Add Public Holiday</DialogTitle><DialogDescription>Record a new public holiday for all developers.</DialogDescription></DialogHeader>
                <AddHolidayForm onFormSubmissionSuccess={onSuccess} />
            </DialogContent>
        </Dialog>
    );
}

function SalarySlipDialog({ isOpen, onOpenChange, devStats, month, onPrint, slipRef }) {
  if (!devStats) return null;
  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg p-0">
             <DialogHeader className="p-6 pb-0">
              <DialogTitle className='sr-only'>Salary Slip for {devStats.name}</DialogTitle>
            </DialogHeader>
              <div ref={slipRef} className="p-6 slip-container-for-pdf">
                 <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">waansaung</h2>
                    <p className="text-sm text-slate-500">Salary Slip for {format(month, 'MMMM yyyy')}</p>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="font-medium text-slate-600">Developer:</span>
                        <span className="font-semibold text-slate-800">{devStats.name}</span>
                    </div>
                     {devStats.paymentInfo && (
                        <div className="flex justify-between">
                            <span className="font-medium text-slate-600">Account:</span>
                            <span className="font-semibold text-slate-800 flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-500"/>{devStats.paymentInfo}</span>
                        </div>
                     )}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                    <DetailRow label="Base Salary" value={`${formatCurrency(devStats.salary)} MMK`} />
                    <Separator className="my-1 bg-slate-100" />
                    <DetailRow label="Total Leave Days" value={devStats.leaveDays} />
                    <DetailRow label="Allowed Leave" value={FREE_LEAVE_DAYS} />
                    <DetailRow label="Extra Leave Days" value={devStats.extraLeaveDays} isNegative={devStats.extraLeaveDays > 0} />
                    <Separator className="my-1 bg-slate-100" />
                    <DetailRow label="Deduction per Day" value={`${formatCurrency(Math.round(devStats.dailyWage))} MMK`} />
                    <DetailRow label="Leave Deduction" value={`${formatCurrency(Math.round(devStats.salaryDeduction))} MMK`} isNegative={devStats.salaryDeduction > 0} />
                    <DetailRow label="General Deduction" value={`${formatCurrency(Math.round(devStats.generalDeduction))} MMK`} isNegative={devStats.generalDeduction > 0}/>
                </div>
                <Separator className="my-4" />
                <div className="bg-slate-100 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-base font-bold text-slate-800">Net Payable Salary</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(Math.round(devStats.finalSalary))} MMK</span>
                </div>
                 <div className="mt-6 text-center text-xs text-slate-400">
                    <p>This is a computer-generated salary slip and does not require a signature.</p>
                </div>
              </div>
              <DialogFooter className="mt-0 p-4 border-t bg-slate-50 no-print rounded-b-lg">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button onClick={onPrint}><Printer className="mr-2 h-4 w-4"/> Print Slip</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  );
}

const DetailRow = ({ label, value, isNegative = false }: { label: string, value: string | number, isNegative?: boolean }) => (
    <div className={cn("flex justify-between items-center py-1", isNegative && value !== 0 && "text-destructive")}>
        <p className="text-slate-600">{label}</p>
        <p className="font-medium">
            {typeof value === 'number' ? formatCurrency(value) : value}
        </p>
    </div>
);
