
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Employee, LeaveRequest } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { isWithinInterval, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

interface PivotRow {
  [departmentName: string]: {
    name: string;
    leaveType?: LeaveRequest['leaveType'];
  } | undefined;
}

const leaveTypeBadgeVariant = (leaveType?: LeaveRequest['leaveType']) => {
  if (!leaveType) return "secondary";
  switch (leaveType) {
    case "ကြိုတင်ခွင့်": return "default";
    case "အလုပ်နောက်ကျ": return "outline";
    case "ခွင့်(နေမကောင်း)": return "default"; // or another color
    case "ခွင့်ရက်ရှည်": return "secondary";
    case "ခွင့်မဲ့ပျက်": return "destructive";
    case "အပြစ်ပေး (ဖိုင်း)": return "destructive";
    default: return "secondary";
  }
};

export default function CompanyDepartmentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const employeesCollectionRef = collection(db, "employees");
        const leaveRequestsCollectionRef = collection(db, "leaveRequests");

        const employeesQuery = query(employeesCollectionRef);
        const leaveRequestsQuery = query(leaveRequestsCollectionRef, where("status", "==", "Approved"));
        
        const [employeesSnapshot, leaveRequestsSnapshot] = await Promise.all([
            getDocs(employeesQuery),
            getDocs(leaveRequestsQuery)
        ]);

        const fetchedEmployees: Employee[] = employeesSnapshot.docs.map(doc => {
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
            company: data.company || "Unknown Company",
            gender: data.gender || "N/A",
            displayOrder: data.displayOrder === undefined ? undefined : Number(data.displayOrder),
          } as Employee;
        });

        const fetchedLeaveRequests: LeaveRequest[] = leaveRequestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as LeaveRequest));
        
        setEmployees(fetchedEmployees);
        setLeaveRequests(fetchedLeaveRequests);

        if (fetchedEmployees.length > 0 && !selectedCompany) {
            const companies = [...new Set(fetchedEmployees.map(emp => emp.company).filter(Boolean) as string[])].sort();
            if (companies.length > 0) {
              setSelectedCompany(companies[0]);
            }
        }
      } catch (error) {
        console.error("Error fetching data for Company Depts page:", error);
        toast({
          title: "Error Fetching Data",
          description: "Could not load employee and leave information. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const uniqueCompanies = useMemo(() => {
    if (employees.length === 0) return [];
    return [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [employees]);


  const companySpecificEmployeePivotTable = useMemo(() => {
    if (!selectedCompany || employees.length === 0) return null;

    const today = startOfDay(new Date());

    const todaysActiveLeaves = leaveRequests.filter(req => {
      if (req.status !== 'Approved') return false;
      try {
        const startDate = parseISO(req.startDate);
        const endDate = parseISO(req.endDate);
        if (isValid(startDate) && isValid(endDate)) {
          return isWithinInterval(today, { start: startDate, end: endOfDay(endDate) });
        }
        return false;
      } catch (e) {
        return false;
      }
    });
    
    const leaveMap = new Map<string, LeaveRequest['leaveType']>();
    todaysActiveLeaves.forEach(leave => {
        leaveMap.set(leave.employeeId, leave.leaveType);
    });

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

    for (const dept in employeesByDept) {
      employeesByDept[dept].sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== undefined) return -1;
        if (b.displayOrder !== undefined) return 1;

        const roleA = a.role === 'ခေါင်းဆောင်' ? 0 : 1;
        const roleB = b.role === 'ခေါင်းဆောင်' ? 0 : 1;
        if (roleA !== roleB) return roleA - roleB;

        const genderA = a.gender === 'Male' ? 0 : a.gender === 'Female' ? 1 : 2;
        const genderB = b.gender === 'Male' ? 0 : b.gender === 'Female' ? 1 : 2;
        if (genderA !== genderB) return genderA - genderB;

        return a.name.localeCompare(b.name);
      });
    }

    const allDepartments = Object.keys(employeesByDept).sort();
    const maxRows = Math.max(0, ...Object.values(employeesByDept).map(arr => arr.length));
    
    const pivotData: PivotRow[] = [];
    for (let i = 0; i < maxRows; i++) {
      const row: PivotRow = {};
      allDepartments.forEach(dept => {
        const employee = employeesByDept[dept][i];
        if (employee) {
          const leaveType = leaveMap.get(employee.id);
          row[dept] = {
            name: `${i + 1}. ${employee.name}`,
            leaveType: leaveType,
          };
        } else {
          row[dept] = undefined;
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
            Employee names are listed with their index under their respective department. Employees on leave today will have a badge indicating their leave type.
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
                        <TableCell key={`${dept}-${index}`} className="py-2 px-4 min-w-[200px] align-top">
                          {row[dept] ? (
                            <div className="flex items-center gap-2">
                              <span>{row[dept]?.name}</span>
                              {row[dept]?.leaveType && (
                                <Badge variant={leaveTypeBadgeVariant(row[dept]?.leaveType)} className="whitespace-nowrap font-medium text-xs">
                                  {row[dept]?.leaveType}
                                </Badge>
                              )}
                            </div>
                          ) : ''}
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
  }, [employees, selectedCompany, leaveRequests]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading data...</p>
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

    