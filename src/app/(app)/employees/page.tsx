
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee } from "@/types";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// MOCK_EMPLOYEES_DATA is no longer the primary source, but can be kept for reference or initial seeding if needed.
// For now, we will fetch directly from Firestore.
// export const MOCK_EMPLOYEES_DATA: Employee[] = [ ... ]; // Removed for Firestore integration

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      // Example: Order by name. You can adjust the ordering as needed.
      const q = query(employeesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure all fields from Employee type are present, providing defaults if necessary
          name: data.name || "",
          employeeId: data.employeeId || "",
          department: data.department || "",
          role: data.role || "",
          email: data.email || "",
          phone: data.phone || "",
          startDate: data.startDate || "", // Assuming startDate is stored as a string
          status: data.status || "Active",
          avatar: data.avatar || "",
          company: data.company || "",
          salary: data.salary === undefined ? undefined : Number(data.salary), // Ensure salary is number or undefined
        } as Employee;
      });
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employees from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const uniqueDepartments = useMemo(() => {
    return [...new Set(employees.map(emp => emp.department))].sort();
  }, [employees]);

  const uniqueRoles = useMemo(() => {
    return [...new Set(employees.map(emp => emp.role))].sort();
  }, [employees]);
  
  const uniqueCompanies = useMemo(() => {
    return [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [employees]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-semibold mb-6">Employee Directory</h1>
      <DataTable 
        columnGenerator={getColumns} 
        data={employees} 
        uniqueDepartments={uniqueDepartments} 
        uniqueRoles={uniqueRoles} 
        uniqueCompanies={uniqueCompanies}
        onRefreshData={fetchEmployees} // Pass refetch function
      />
    </div>
  );
}
