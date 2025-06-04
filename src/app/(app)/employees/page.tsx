
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee } from "@/types";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore'; // Removed limit
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
// import { useAuth } from '@/contexts/auth-context'; // For admin check

// const EMPLOYEES_FETCH_LIMIT = 30; // Limit for initial fetch - REMOVED

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  // const { user, isAdmin, loading: authLoading } = useAuth();

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      // Apply limit to the query - REMOVED LIMIT
      const q = query(employeesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "",
          employeeId: data.employeeId || "",
          department: data.department || "",
          role: data.role || "",
          email: data.email || "",
          phone: data.phone || "",
          startDate: data.startDate || "", 
          status: data.status || "Active",
          avatar: data.avatar || "",
          company: data.company || "",
          salary: data.salary === undefined ? undefined : Number(data.salary),
          gender: data.gender || "Prefer not to say",
        } as Employee;
      });
      setEmployees(fetchedEmployees);

      // Removed the toast message about truncated list
      // if (querySnapshot.docs.length >= EMPLOYEES_FETCH_LIMIT) {
      //   toast({
      //     title: "Employee List Truncated",
      //     description: `Showing the first ${EMPLOYEES_FETCH_LIMIT} employees. Full list view requires pagination or 'load more'.`,
      //     variant: "default",
      //   });
      // }

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
        onRefreshData={fetchEmployees} 
      />
    </div>
  );
}
    
