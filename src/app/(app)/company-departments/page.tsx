
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Employee } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface PivotRow {
  [departmentName: string]: string | undefined;
}

export default function CompanyDepartmentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchEmployeesData() {
      setIsLoading(true);
      try {
        const employeesCollectionRef = collection(db, "employees");
        // We will do sorting on the client side based on complex logic
        const q = query(employeesCollectionRef);
        const querySnapshot = await getDocs(q);
        const fetchedEmployees: Employee[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unknown Name",
            employeeId: data.employeeId || "N/A",
            department: data.department || "Unknown Department",
            role: data.role || "Unknown Role",
            email: data.email || "N/A",
            phone: data.phone || "N/A",
            startDate: data.startDate || "N/A",
            status: data.status || "Active",
            avatar: data.avatar || undefined,
            salary: data.salary === undefined ? undefined : Number(data.salary),
            company: data.company || "Unknown Company", // Ensure company has a fallback
            gender: data.gender || "N/A",
            displayOrder: data.displayOrder === undefined ? undefined : Number(data.displayOrder), // Add displayOrder
          } as Employee;
        });
        setEmployees(fetchedEmployees);
        if (fetchedEmployees.length > 0 && !selectedCompany) {
            const companies = [...new Set(fetchedEmployees.map(emp => emp.company).filter(Boolean) as string[])].sort();
            if (companies.length > 0) {
              setSelectedCompany(companies[0]);
            }
        }
      } catch (error) {
        console.error("Error fetching employees for Company Depts page:", error);
        toast({
          title: "Error Fetching Data",
          description: "Could not load employee information. Please check your internet connection or try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmployeesData();
  }, [toast]);

  const uniqueCompanies = useMemo(() => {
    if (employees.length === 0) return [];
    return [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [employees]);


  const companySpecificEmployeePivotTable = useMemo(() => {
    if (!selectedCompany || employees.length === 0) return null;

    const companyEmployees = employees.filter(emp => emp.company === selectedCompany && emp.status === 'Active');
    if (companyEmployees.length === 0) {
        return (
             <Card className="shadow-lg rounded-lg overflow-hidden mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                    Employees in {selectedCompany}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground py-4 px-4">No active employees found for {selectedCompany}.</p>
                </CardContent>
            </Card>
        )
    };

    const employeesByDept: Record<string, Employee[]> = {};
    companyEmployees.forEach(emp => {
      const dept = emp.department || 'Unknown Department';
      if (!employeesByDept[dept]) {
        employeesByDept[dept] = [];
      }
      employeesByDept[dept].push(emp);
    });

    // Custom sorting within each department
    for (const dept in employeesByDept) {
      employeesByDept[dept].sort((a, b) => {
        // 1. Sort by displayOrder if it exists
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== undefined) return -1; // a comes first
        if (b.displayOrder !== undefined) return 1;  // b comes first

        // 2. If no displayOrder, sort by role ("ခေါင်းဆောင်" first)
        const roleA = a.role === 'ခေါင်းဆောင်' ? 0 : 1;
        const roleB = b.role === 'ခေါင်းဆောင်' ? 0 : 1;
        if (roleA !== roleB) return roleA - roleB;

        // 3. Then sort by gender ('Male' first)
        const genderA = a.gender === 'Male' ? 0 : a.gender === 'Female' ? 1 : 2;
        const genderB = b.gender === 'Male' ? 0 : b.gender === 'Female' ? 1 : 2;
        if (genderA !== genderB) return genderA - genderB;

        // 4. Finally, sort by name alphabetically
        return a.name.localeCompare(b.name);
      });
    }

    const allDepartments = Object.keys(employeesByDept).sort();
    const maxRows = Math.max(0, ...Object.values(employeesByDept).map(arr => arr.length));
    
    const pivotData: PivotRow[] = [];
    for (let i = 0; i < maxRows; i++) {
      const row: PivotRow = {};
      allDepartments.forEach(dept => {
        if (employeesByDept[dept][i]) {
          // Add the department-specific index before the name
          row[dept] = `${i + 1}. ${employeesByDept[dept][i].name}`;
        } else {
          row[dept] = '';
        }
      });
      pivotData.push(row);
    }


    return (
      <Card key={selectedCompany} className="shadow-lg rounded-lg overflow-hidden mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            Employees in {selectedCompany}
          </CardTitle>
          <CardDescription>
            Employee names are listed with their index under their respective department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allDepartments.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {allDepartments.map(dept => (
                      <TableHead key={dept} className="font-semibold min-w-[200px] px-4 text-left">{dept}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      {allDepartments.map(dept => (
                        <TableCell key={`${dept}-${index}`} className="py-2 px-4 min-w-[200px]">
                          {row[dept]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground py-4 px-4">No departments with active employees found for {selectedCompany}.</p>
          )}
        </CardContent>
      </Card>
    );
  }, [employees, selectedCompany]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading employee data...</p>
      </div>
    );
  }

  if (employees.length === 0) {
     return (
      <div className="container mx-auto py-10 text-center h-[calc(100vh-200px)] flex flex-col justify-center items-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground">No Employee Data Found</h2>
        <p className="text-muted-foreground">There is no employee information available to display departments.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold flex items-center">
          <Building2 className="mr-3 h-8 w-8 text-primary" />
          Company Departments &amp; Employees
        </h1>
      </div>

      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle>Filter by Company</CardTitle>
          <CardDescription>Choose a company to view its employee pivot table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company-select" className="mb-2 block text-sm font-medium text-muted-foreground">Select Company</Label>
            {uniqueCompanies.length > 0 ? (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger id="company-select" className="w-full md:w-[300px] shadow-sm">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCompanies.map(company => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-sm">No companies available to filter.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {companySpecificEmployeePivotTable}
      
    </div>
  );
}
