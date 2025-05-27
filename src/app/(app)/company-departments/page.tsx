
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
import { Building2, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';

// Mock data specifically for this page to ensure all necessary fields are present.
// In a real application, this data would come from a shared service or API.
const MOCK_EMPLOYEES_DATA: Employee[] = [
    { id: "1", name: "Alice Wonderland", employeeId: "EMP001", department: "Engineering", role: "Software Engineer", email: "alice.w@example.com", phone: "555-0101", startDate: "2022-01-15", status: "Active", avatar: "https://placehold.co/40x40/E6A4B4/FFFFFF.png", salary: 90000, company: "Innovatech Solutions" },
    { id: "2", name: "Bob The Builder", employeeId: "EMP002", department: "Engineering", role: "Senior Engineer", email: "bob.b@example.com", phone: "555-0102", startDate: "2020-07-20", status: "Active", avatar: "https://placehold.co/40x40/A4B4E6/FFFFFF.png", salary: 115000, company: "Synergy Corp" },
    { id: "3", name: "Charlie Brown", employeeId: "EMP003", department: "Sales", role: "Sales Manager", email: "charlie.b@example.com", phone: "555-0103", startDate: "2021-03-10", status: "Active", avatar: "https://placehold.co/40x40/B4E6A4/FFFFFF.png", salary: 92000, company: "QuantumLeap Inc." },
    { id: "4", name: "Diana Prince", employeeId: "EMP004", department: "Marketing", role: "Marketing Specialist", email: "diana.p@example.com", phone: "555-0104", startDate: "2023-05-01", status: "Active", avatar: "https://placehold.co/40x40/E6DCA4/FFFFFF.png", salary: 78000, company: "Innovatech Solutions" },
    { id: "5", name: "Edward Scissorhands", employeeId: "EMP005", department: "HR", role: "HR Business Partner", email: "edward.s@example.com", phone: "555-0105", startDate: "2019-11-05", status: "Inactive", avatar: "https://placehold.co/40x40/A4E6E1/FFFFFF.png", company: "Synergy Corp", salary: 75000 },
    { id: "6", name: "Fiona Apple", employeeId: "EMP006", department: "Support", role: "Support Lead", email: "fiona.a@example.com", phone: "555-0106", startDate: "2022-08-12", status: "Active", salary: 70000, company: "QuantumLeap Inc." },
    { id: "7", name: "George Jetson", employeeId: "EMP007", department: "Finance", role: "Accountant", email: "george.j@example.com", phone: "555-0107", startDate: "2023-01-30", status: "Active", company: "Innovatech Solutions", salary: 80000 },
    { id: "8", name: "Harry Potter", employeeId: "EMP008", department: "Engineering", role: "Frontend Developer", email: "harry.p@example.com", phone: "555-0108", startDate: "2023-09-01", status: "Active", salary: 85000, company: "Synergy Corp" },
    { id: "9", name: "Ivy League", employeeId: "EMP009", department: "Sales", role: "Account Executive", email: "ivy.l@example.com", phone: "555-0109", startDate: "2022-06-15", status: "Inactive", salary: 88000, company: "QuantumLeap Inc." },
    { id: "10", name: "Jack Sparrow", employeeId: "EMP010", department: "Marketing", role: "Content Creator", email: "jack.s@example.com", phone: "555-0110", startDate: "2024-01-10", status: "Active", company: "Innovatech Solutions", salary: 72000 },
    { id: "11", name: "Kara Danvers", employeeId: "EMP011", department: "Support", role: "Support Specialist", email: "kara.d@example.com", phone: "555-0111", startDate: "2023-03-15", status: "Active", salary: 68000, company: "Synergy Corp"},
    { id: "12", name: "Luke Skywalker", employeeId: "EMP012", department: "Engineering", role: "DevOps Engineer", email: "luke.s@example.com", phone: "555-0112", startDate: "2021-10-01", status: "Active", salary: 105000, company: "QuantumLeap Inc."},
    { id: "13", name: "Hermione Granger", employeeId: "EMP013", department: "Engineering", role: "Backend Developer", email: "hermione.g@example.com", phone: "555-0113", startDate: "2022-03-01", status: "Active", salary: 95000, company: "Innovatech Solutions" },
    { id: "14", name: "Ron Weasley", employeeId: "EMP014", department: "Sales", role: "Sales Representative", email: "ron.w@example.com", phone: "555-0114", startDate: "2023-07-11", status: "Active", salary: 82000, company: "Innovatech Solutions" },
    { id: "15", name: "Tony Stark", employeeId: "EMP015", department: "Engineering", role: "Chief Engineer", email: "tony.s@example.com", phone: "555-0115", startDate: "2018-05-10", status: "Active", salary: 150000, company: "Synergy Corp" },
    { id: "16", name: "Pepper Potts", employeeId: "EMP016", department: "HR", role: "CEO", email: "pepper.p@example.com", phone: "555-0116", startDate: "2017-09-12", status: "Active", salary: 200000, company: "Synergy Corp" },
    { id: "17", name: "Bruce Wayne", employeeId: "EMP017", department: "Finance", role: "CFO", email: "bruce.w@example.com", phone: "555-0117", startDate: "2019-04-01", status: "Active", salary: 180000, company: "QuantumLeap Inc." },
    { id: "18", name: "Clark Kent", employeeId: "EMP018", department: "Marketing", role: "PR Manager", email: "clark.k@example.com", phone: "555-0118", startDate: "2020-11-20", status: "Active", salary: 90000, company: "QuantumLeap Inc." },
    { id: "19", name: "Gimli Son of Gloin", employeeId: "EMP019", department: "Engineering", role: "Axe Specialist", email: "gimli@example.com", phone: "555-0119", startDate: "2020-01-01", status: "Active", salary: 100000, company: "Innovatech Solutions" },
    { id: "20", name: "Legolas Greenleaf", employeeId: "EMP020", department: "Engineering", role: "Archery Master", email: "legolas@example.com", phone: "555-0120", startDate: "2019-01-01", status: "Active", salary: 102000, company: "Innovatech Solutions" },
];

async function getEmployeesData(): Promise<Employee[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 50)); 
  return MOCK_EMPLOYEES_DATA;
}

interface DepartmentInfo {
  name: string;
  employeeCount: number;
  employeeSamples: string[];
}

export default function CompanyDepartmentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchData() {
      const data = await getEmployeesData();
      setEmployees(data);
    }
    fetchData();
  }, []);

  const uniqueCompanies = useMemo(() => {
    return [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();
  }, [employees]);

  const departmentsInSelectedCompany = useMemo((): DepartmentInfo[] => {
    if (!selectedCompany) return [];
    const companyEmployees = employees.filter(emp => emp.company === selectedCompany);
    const departmentMap: Record<string, { count: number; samples: string[] }> = {};

    companyEmployees.forEach(emp => {
      if (!departmentMap[emp.department]) {
        departmentMap[emp.department] = { count: 0, samples: [] };
      }
      departmentMap[emp.department].count++;
      if (departmentMap[emp.department].samples.length < 2) { // Show up to 2 samples
        departmentMap[emp.department].samples.push(emp.name);
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
      const companyEmployees = employees.filter(emp => emp.company === companyName);
      if (companyEmployees.length === 0) return null;

      const companyDepartments = [...new Set(companyEmployees.map(emp => emp.department))].sort();
      
      return (
        <Card key={companyName} className="shadow-lg rounded-lg overflow-hidden mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {/* Optional: Add a company icon here if desired */}
              Employees in {companyName}
            </CardTitle>
            <CardDescription>
              Departments are listed as columns. Employee names appear under their respective department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyDepartments.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] font-semibold sticky left-0 bg-card z-10">#</TableHead>
                      <TableHead className="w-[200px] font-semibold sticky left-[66px] bg-card z-10">Employee Name</TableHead>
                      {companyDepartments.map(dept => (
                        <TableHead key={dept} className="font-semibold min-w-[150px]">{dept}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyEmployees.sort((a,b) => a.name.localeCompare(b.name)).map((employee, index) => (
                      <TableRow key={employee.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium py-3 sticky left-0 bg-card z-0">{index + 1}</TableCell>
                        <TableCell className="py-3 sticky left-[66px] bg-card z-0">{employee.name}</TableCell>
                        {companyDepartments.map(dept => (
                          <TableCell key={`${employee.id}-${dept}`} className="py-3">
                            {employee.department === dept ? employee.name : ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground py-4">No departments with employees found for {companyName}.</p>
            )}
          </CardContent>
        </Card>
      );
    }).filter(Boolean);
  }, [employees, uniqueCompanies]);


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
                      <TableRow>
                        <TableHead className="w-[60%] font-semibold">Department Name</TableHead>
                        <TableHead className="text-left font-semibold">Employees ({employees.filter(e => e.company === selectedCompany).length} total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentsInSelectedCompany.map(dept => (
                        <TableRow key={dept.name} className="hover:bg-muted/50">
                          <TableCell className="font-medium py-3">{dept.name}</TableCell>
                          <TableCell className="py-3">
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
                <p className="text-muted-foreground py-4">No departments found for {selectedCompany}, or no employees currently in this company.</p>
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
                    .filter(emp => emp.company === selectedCompany && emp.department === dept.name)
                    .sort((a, b) => a.name.localeCompare(b.name));

                  if (deptEmployees.length === 0) return null; 

                  return (
                    <div key={dept.name} className="mb-8 last:mb-0">
                      <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-foreground/90">{dept.name} ({dept.employeeCount})</h3>
                      <div className="rounded-md border overflow-x-auto bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold">Name</TableHead>
                              <TableHead className="font-semibold">Role</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deptEmployees.map(emp => (
                              <TableRow key={emp.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium py-3">{emp.name}</TableCell>
                                <TableCell className="py-3">{emp.role}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground py-4">No employees found in any department for {selectedCompany}.</p>
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
            <p className="text-muted-foreground">Please select a company from the dropdown above to view its department summary and employee list.</p>
          </CardContent>
        </Card>
      )}

      {/* New company-specific pivot tables section */}
      {employees.length > 0 && companySpecificEmployeePivotTables}
      
    </div>
  );
}
