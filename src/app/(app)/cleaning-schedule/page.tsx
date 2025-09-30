// src/app/(app)/cleaning-schedule/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Employee, CleaningSchedule } from "@/types";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ListTodo, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { format, getDayOfYear, startOfDay } from 'date-fns';
import { updateCleaningStatus } from './actions';
import { useAuth } from '@/contexts/auth-context';

const CLEANING_ROWS = ["Aတန်း", "Bတန်း", "Cတန်း", "Dတန်း", "Eတန်း", "Fတန်း", "အပြင်တန်း"];
const TARGET_DEPARTMENT = "G-ထွက်";
const TODAY_DATE_ID = format(startOfDay(new Date()), 'yyyy-MM-dd');

export default function CleaningSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<CleaningSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDayOffset = (date: Date) => {
    return getDayOfYear(date);
  };
  
  const generateAndFetchSchedule = useCallback(async (date: Date) => {
    setIsLoading(true);
    const dateId = format(startOfDay(date), 'yyyy-MM-dd');

    try {
        // Fetch employees of the target department
        const employeesQuery = query(collection(db, "employees"), where("department", "==", TARGET_DEPARTMENT), where("status", "==", "Active"));
        const empSnapshot = await getDocs(employeesQuery);
        const fetchedEmployees: Employee[] = empSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee)).sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(fetchedEmployees);

        if (fetchedEmployees.length === 0) {
            setSchedule(null);
            setIsLoading(false);
            return;
        }

        // Check if a schedule for today already exists
        const scheduleDocRef = doc(db, "cleaningSchedules", dateId);
        const scheduleDocSnap = await getDoc(scheduleDocRef);

        if (scheduleDocSnap.exists()) {
            setSchedule(scheduleDocSnap.data() as CleaningSchedule);
        } else {
            // No schedule exists, so we generate a new one
            const dayOffset = getDayOffset(date);
            const newAssignments = fetchedEmployees.map((employee, index) => {
                const rowIndex = (dayOffset + index) % CLEANING_ROWS.length;
                return {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    assignedRow: CLEANING_ROWS[rowIndex],
                    isCompleted: false,
                };
            });
            
            const newSchedule: CleaningSchedule = {
                id: dateId,
                date: dateId,
                assignments: newAssignments,
            };

            // Save the new schedule to Firestore
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
  
  const handleStatusChange = async (employeeId: string, isCompleted: boolean) => {
    if (!schedule) return;

    // Optimistic UI update
    const originalAssignments = schedule.assignments;
    const newAssignments = originalAssignments.map(a =>
      a.employeeId === employeeId ? { ...a, isCompleted } : a
    );
    setSchedule({ ...schedule, assignments: newAssignments });

    // Call server action
    try {
      const result = await updateCleaningStatus(TODAY_DATE_ID, employeeId, isCompleted);
      if (!result.success) {
        // Revert UI on failure
        setSchedule({ ...schedule, assignments: originalAssignments });
        toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "Status Updated", description: `${result.employeeName}'s task status changed.` });
      }
    } catch (error) {
      // Revert UI on error
      setSchedule({ ...schedule, assignments: originalAssignments });
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
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
            Daily rotating cleaning assignments. Check the box upon completion.
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
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 data-[completed=true]:bg-green-50 data-[completed=true]:border-green-200 dark:data-[completed=true]:bg-green-900/20 dark:data-[completed=true]:border-green-800"
                  data-completed={assignment.isCompleted}
                >
                  <div className="flex items-center gap-4">
                     <Checkbox
                        id={`task-${assignment.employeeId}`}
                        checked={assignment.isCompleted}
                        onCheckedChange={(checked) => handleStatusChange(assignment.employeeId, !!checked)}
                        aria-label={`Mark task for ${assignment.employeeName} as complete`}
                        disabled={!isAdmin}
                      />
                    <div>
                      <Label htmlFor={`task-${assignment.employeeId}`} className="font-semibold text-lg cursor-pointer">{assignment.employeeName}</Label>
                      <p className="text-sm text-muted-foreground">Task: <span className="font-medium text-primary">{assignment.assignedRow}</span></p>
                    </div>
                  </div>
                  {assignment.isCompleted && (
                    <div className="text-xs text-green-600 font-medium dark:text-green-400">
                      Completed
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
