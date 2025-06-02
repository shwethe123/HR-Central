
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

interface DepartmentInfo {
  name: string;
  employeeCount: number;
  employeeSamples: string[];
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
        const q = query(employeesCollectionRef, orderBy("name", "asc"));
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
          } as Employee;
        });
        setEmployees(fetchedEmployees);
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

  const departmentsInSelectedCompany = useMemo((): DepartmentInfo[] => {
    if (!selectedCompany || employees.length === 0) return [];
    const companyEmployees = employees.filter(emp => emp.company === selectedCompany);
    const departmentMap: Record<string, { count: number; samples: string[] }> = {};

    companyEmployees.forEach(emp => {
      const deptName = emp.department || "Unknown Department";
      if (!departmentMap[deptName]) {
        departmentMap[deptName] = { count: 0, samples: [] };
      }
      departmentMap[deptName].count++;
      if (departmentMap[deptName].samples.length < 2) { 
        departmentMap[deptName].samples.push(emp.name);
      }
    });

    return Object.entries(departmentMap)
      .map(([name, data]) => ({ 
        name, 
        employeeCount: data.count,
        employeeSamples: data.samples,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, selectedCompany]);

  const companySpecificEmployeePivotTables = useMemo(() => {
    if (employees.length === 0) return null;

    return uniqueCompanies.map(companyName => {
      const companyEmployees = employees
        .filter(emp => emp.company === companyName)
        .sort((a, b) => {
          const deptComparison = (a.department || "Unknown").localeCompare(b.department || "Unknown");
          if (deptComparison !== 0) {
            return deptComparison;
          }
          return (a.name || "Unknown").localeCompare(b.name || "Unknown");
        });
      if (companyEmployees.length === 0) return null;

      const companyDepartments = [...new Set(companyEmployees.map(emp => emp.department || "Unknown Department"))].sort();
      
      return (
        <Card key={companyName} className="shadow-lg rounded-lg overflow-hidden mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              Employees in {companyName}
            </CardTitle>
            <CardDescription>
              Departments are listed as columns. Employee names appear under their respective department if they belong to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyDepartments.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px] px-4 font-semibold sticky left-0 bg-card z-10">#</TableHead>
                      {companyDepartments.map(dept => (
                        <TableHead key={dept} className="font-semibold min-w-[200px] px-4 text-left">{dept}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyEmployees.map((employee, index) => (
                      <TableRow key={employee.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-3 px-4 sticky left-0 bg-card z-0">{index + 1}</TableCell>
                        {companyDepartments.map(dept => (
                          <TableCell key={`${employee.id}-${dept}`} className="py-3 px-4 min-w-[200px]">
                            {(employee.department || "Unknown Department") === dept ? employee.name : ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground py-4 px-4">No departments with employees found for {companyName}.</p>
            )}
          </CardContent>
        </Card>
      );
    }).filter(Boolean);
  }, [employees, uniqueCompanies]);

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
          Company Departments & Employees
        </h1>
      </div>

      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle>Filter by Company</CardTitle>
          <CardDescription>Choose a company to view its departments, employee counts, and employee list.</CardDescription>
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

      {selectedCompany && (
        <>
          <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-6 w-6 text-primary" />
                Departments in {selectedCompany}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentsInSelectedCompany.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[60%] px-4 font-semibold text-left">Department Name</TableHead>
                        <TableHead className="px-4 text-left font-semibold">Employees ({employees.filter(e => e.company === selectedCompany).length} total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentsInSelectedCompany.map(dept => (
                        <TableRow key={dept.name} className="hover:bg-muted/50">
                          <TableCell className="font-medium py-3 px-4">{dept.name}</TableCell>
                          <TableCell className="py-3 px-4">
                            {dept.employeeSamples.join(", ")}
                            {dept.employeeCount > dept.employeeSamples.length && (
                              <span>
                                {dept.employeeSamples.length > 0 ? ", " : ""}
                                (+{dept.employeeCount - dept.employeeSamples.length} more)
                              </span>
                            )}
                             {dept.employeeCount === 0 && <span>No employees</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground py-4 px-4">No departments found for {selectedCompany}, or no employees currently in this company.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-6 w-6 text-primary" />
                Employees in {selectedCompany}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {departmentsInSelectedCompany.filter(d => d.employeeCount > 0).length > 0 ? (
                departmentsInSelectedCompany.map(dept => {
                  if (dept.employeeCount === 0) return null;

                  const deptEmployees = employees
                    .filter(emp => emp.company === selectedCompany && (emp.department || "Unknown Department") === dept.name)
                    .sort((a, b) => (a.name || "Unknown").localeCompare(b.name || "Unknown"));

                  if (deptEmployees.length === 0) return null; 

                  return (
                    <div key={dept.name} className="mb-8 last:mb-0">
                      <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-foreground/90">{dept.name} ({dept.employeeCount})</h3>
                      <div className="rounded-md border overflow-x-auto bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[50px] px-4 font-semibold text-left">#</TableHead>
                              <TableHead className="px-4 font-semibold text-left">Name</TableHead>
                              <TableHead className="px-4 font-semibold text-left">Role</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deptEmployees.map((emp, empIndex) => (
                              <TableRow key={emp.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium py-3 px-4">{empIndex + 1}</TableCell>
                                <TableCell className="font-medium py-3 px-4">{emp.name}</TableCell>
                                <TableCell className="py-3 px-4">{emp.role}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground py-4 px-4">No employees found in any department for {selectedCompany}.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

       {!selectedCompany && employees.length > 0 && (
        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground px-4">Please select a company from the dropdown above to view its department summary and employee list.</p>
          </CardContent>
        </Card>
      )}
      
      {employees.length > 0 && companySpecificEmployeePivotTables}
      
    </div>
  );
}

    
