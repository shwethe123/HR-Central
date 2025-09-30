// src/app/(app)/cleaning-schedule/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Employee, CleaningSchedule, CleaningStatus } from "@/types";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ListTodo, Loader2, Calendar, Check, CheckCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { format, getDayOfYear, startOfDay } from 'date-fns';
import { updateCleaningStatus } from './actions';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const CLEANING_ROWS = ["Aတန်း", "Bတန်း", "Cတန်း", "Dတန်း", "Eတန်း", "Fတန်း", "အပြင်တန်း"];
const TARGET_DEPARTMENT = "G-ထွက်";
const TODAY_DATE_ID = format(startOfDay(new Date()), 'yyyy-MM-dd');

export default function CleaningSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<CleaningSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth(); // Assume isAdmin also means "G-ထွက် ခေါင်းဆောင်" for now
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDayOffset = (date: Date) => {
    return getDayOfYear(date);
  };
  
  const generateAndFetchSchedule = useCallback(async (date: Date) => {
    setIsLoading(true);
    const dateId = format(startOfDay(date), 'yyyy-MM-dd');

    try {
        const employeesQuery = query(collection(db, "employees"), where("department", "==", TARGET_DEPARTMENT), where("status", "==", "Active"));
        const empSnapshot = await getDocs(employeesQuery);
        const fetchedEmployees: Employee[] = empSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee)).sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(fetchedEmployees);

        if (fetchedEmployees.length === 0) {
            setSchedule(null);
            setIsLoading(false);
            return;
        }

        const scheduleDocRef = doc(db, "cleaningSchedules", dateId);
        const scheduleDocSnap = await getDoc(scheduleDocRef);

        if (scheduleDocSnap.exists()) {
            setSchedule(scheduleDocSnap.data() as CleaningSchedule);
        } else {
            const dayOffset = getDayOffset(date);
            const newAssignments = fetchedEmployees.map((employee, index) => {
                const rowIndex = (dayOffset + index) % CLEANING_ROWS.length;
                return {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    assignedRow: CLEANING_ROWS[rowIndex],
                    status: 'Pending' as CleaningStatus,
                };
            });
            
            const newSchedule: CleaningSchedule = {
                id: dateId,
                date: dateId,
                assignments: newAssignments,
            };

            await setDoc(scheduleDocRef, newSchedule);
            setSchedule(newSchedule);
        }

    } catch (error) {
        console.error("Error generating or fetching schedule:", error);
        toast({
            title: "Error",
            description: "Could not load or create the cleaning schedule.",
            variant: "destructive",
        });
        setSchedule(null);
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    generateAndFetchSchedule(currentDate);
  }, [generateAndFetchSchedule, currentDate]);
  
  const handleStatusChange = async (employeeId: string, currentStatus: CleaningStatus) => {
    if (!schedule || !user) return;
    
    // Determine the next status
    let newStatus: CleaningStatus;
    if (isAdmin) {
      // Admin can cycle through Pending -> Completed -> Verified -> Pending
      if (currentStatus === 'Pending') newStatus = 'Completed';
      else if (currentStatus === 'Completed') newStatus = 'Verified';
      else newStatus = 'Pending';
    } else {
      // Non-admin can only toggle between Pending and Completed
      if (currentStatus === 'Pending') newStatus = 'Completed';
      else if (currentStatus === 'Completed') newStatus = 'Pending';
      else return; // Can't change 'Verified' status
    }


    const originalAssignments = schedule.assignments;
    const newAssignments = originalAssignments.map(a =>
      a.employeeId === employeeId ? { ...a, status: newStatus } : a
    );
    setSchedule({ ...schedule, assignments: newAssignments });

    try {
      const result = await updateCleaningStatus(TODAY_DATE_ID, employeeId, newStatus);
      if (!result.success) {
        setSchedule({ ...schedule, assignments: originalAssignments });
        toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Status Updated", description: `${result.employeeName}'s task status changed.` });
      }
    } catch (error) {
      setSchedule({ ...schedule, assignments: originalAssignments });
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: CleaningStatus, employeeId: string) => {
    const isClickable = isAdmin && (status === 'Completed' || status === 'Verified');
    
    switch (status) {
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'Completed':
        return (
          <Badge
            variant="secondary"
            className={cn("bg-yellow-100 text-yellow-800 border-yellow-300", isClickable && "cursor-pointer hover:bg-yellow-200")}
            onClick={() => isClickable && handleStatusChange(employeeId, 'Completed')}
          >
            <Check className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case 'Verified':
        return (
          <Badge
             variant="default"
             className={cn("bg-green-100 text-green-800 border-green-300", isClickable && "cursor-pointer hover:bg-green-200")}
             onClick={() => isClickable && handleStatusChange(employeeId, 'Verified')}
          >
            <CheckCheck className="mr-1 h-3 w-3" /> Verified
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };


  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <ListTodo className="mr-3 h-8 w-8 text-primary" />
          Daily Cleaning Schedule
        </h1>
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span className="font-semibold">{format(currentDate, 'MMMM d, yyyy')}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{TARGET_DEPARTMENT} Department - Daily Tasks</CardTitle>
          <CardDescription>
            Employees mark their task as complete. Admins can verify completion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : !schedule || schedule.assignments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No employees found in the "{TARGET_DEPARTMENT}" department to assign tasks.
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.assignments.map((assignment) => (
                <div
                  key={assignment.employeeId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                     <Checkbox
                        id={`task-${assignment.employeeId}`}
                        checked={assignment.status === 'Completed' || assignment.status === 'Verified'}
                        onCheckedChange={() => handleStatusChange(assignment.employeeId, assignment.status)}
                        aria-label={`Mark task for ${assignment.employeeName}`}
                        disabled={!isAdmin && assignment.status === 'Verified'}
                      />
                    <div>
                      <Label htmlFor={`task-${assignment.employeeId}`} className="font-semibold text-lg cursor-pointer">{assignment.employeeName}</Label>
                      <p className="text-sm text-muted-foreground">Task: <span className="font-medium text-primary">{assignment.assignedRow}</span></p>
                    </div>
                  </div>
                  {getStatusBadge(assignment.status, assignment.employeeId)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
