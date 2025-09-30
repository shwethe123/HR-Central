// src/app/(app)/dashboard/new_employee/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee } from "@/types";
import { getColumns } from "@/app/(app)/employees/columns"; // Reusing columns from employees
import { DataTable } from "@/app/(app)/employees/data-table"; // Reusing DataTable from employees
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore'; // Removed 'where'
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { EditEmployeeForm } from '@/app/(app)/employees/edit-employee-form';
import { AddNewEmployeeForm } from './addPost';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { parseISO, isValid } from 'date-fns';

// This page will be adapted to show *only* new or specific types of employees, like Software Developers.
export default function NewEmployeesPage() {
  const { isAdmin } = useAuth();
  const [developers, setDevelopers] = useState<Employee[]>([]); // Renamed to developers
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const fetchDevelopers = useCallback(async () => { // Renamed function
    setIsLoading(true);
    try {
      const developersCollectionRef = collection(db, "developers"); // Changed collection
      const q = query(developersCollectionRef);
      
      const querySnapshot = await getDocs(q);
      const fetchedDevelopers: Employee[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "",
          employeeId: data.employeeId || "",
          department: "Software Development", // Hardcode for consistency
          role: "Software Developer", // Hardcode for consistency
          email: data.email || "",
          phone: data.phone || "",
          startDate: data.startDate || "", 
          status: data.status || "Active",
          avatar: data.avatar || "",
          company: "Default Company", // Hardcode for consistency
          salary: data.salary === undefined ? undefined : Number(data.salary),
          gender: data.gender || "Prefer not to say",
        } as Employee;
      });

      // Sort by startDate on the client-side
      const sortedDevelopers = fetchedDevelopers.sort((a, b) => {
        const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate) : new Date(0);
        const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setDevelopers(sortedDevelopers);
    } catch (error) {
      console.error("Error fetching new developers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch new developer data. This may be due to a missing Firestore index.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  const uniqueDepartments = useMemo(() => {
    return [...new Set(developers.map(emp => emp.department))].sort();
  }, [developers]);

  const uniqueRoles = useMemo(() => {
    return [...new Set(developers.map(emp => emp.role))].sort();
  }, [developers]);
  
  const uniqueCompanies = useMemo(() => {
    return [...new Set(developers.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [developers]);

  const handleEditEmployee = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setIsEditEmployeeDialogOpen(true);
  };

  const handleFormSuccess = async () => {
    setIsEditEmployeeDialogOpen(false);
    setIsAddEmployeeDialogOpen(false);
    setEmployeeToEdit(null); 
    await fetchDevelopers(); // Refresh the list
  };

  if (isLoading && !isEditEmployeeDialogOpen && !isAddEmployeeDialogOpen) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading New Developer Hires...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold flex items-center">
            <UserPlus className="mr-3 h-8 w-8 text-primary" />
            New Software Developer Hires
        </h1>
        {isAdmin && (
          <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add New Developer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>Add New Software Developer</DialogTitle>
                <DialogDescription>
                  Fill in the details below for the new developer.
                </DialogDescription>
              </DialogHeader>
              <AddNewEmployeeForm
                onFormSubmissionSuccess={handleFormSuccess}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <DataTable 
        columnGenerator={getColumns} 
        data={developers} 
        uniqueDepartments={uniqueDepartments} 
        uniqueRoles={uniqueRoles} 
        uniqueCompanies={uniqueCompanies}
        onRefreshData={fetchDevelopers}
        onEditEmployee={handleEditEmployee} 
      />

      {employeeToEdit && (
        <Dialog open={isEditEmployeeDialogOpen} onOpenChange={(isOpen) => {
            setIsEditEmployeeDialogOpen(isOpen);
            if (!isOpen) setEmployeeToEdit(null);
        }}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Edit Employee Details</DialogTitle>
              <DialogDescription>
                Update the information for {employeeToEdit.name}. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <EditEmployeeForm
              employeeToEdit={employeeToEdit}
              uniqueDepartments={uniqueDepartments}
              uniqueRoles={uniqueRoles}
              uniqueCompanies={uniqueCompanies}
              onFormSubmissionSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
