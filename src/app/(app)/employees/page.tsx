import type { Employee } from "@/types";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { promises as fs } from 'fs';
import path from 'path';

// Simulate fetching data
async function getEmployees(): Promise<Employee[]> {
  // In a real app, you'd fetch this from an API
  // For now, let's use a placeholder or mock data file if it exists
  // For this example, hardcoding some data:
  const data: Employee[] = [
    { id: "1", name: "Alice Wonderland", employeeId: "EMP001", department: "Engineering", role: "Software Engineer", email: "alice.w@example.com", phone: "555-0101", startDate: "2022-01-15", status: "Active", avatar: "https://placehold.co/40x40/E6A4B4/FFFFFF.png" },
    { id: "2", name: "Bob The Builder", employeeId: "EMP002", department: "Engineering", role: "Senior Engineer", email: "bob.b@example.com", phone: "555-0102", startDate: "2020-07-20", status: "Active", avatar: "https://placehold.co/40x40/A4B4E6/FFFFFF.png" },
    { id: "3", name: "Charlie Brown", employeeId: "EMP003", department: "Sales", role: "Sales Manager", email: "charlie.b@example.com", phone: "555-0103", startDate: "2021-03-10", status: "Active", avatar: "https://placehold.co/40x40/B4E6A4/FFFFFF.png" },
    { id: "4", name: "Diana Prince", employeeId: "EMP004", department: "Marketing", role: "Marketing Specialist", email: "diana.p@example.com", phone: "555-0104", startDate: "2023-05-01", status: "Active", avatar: "https://placehold.co/40x40/E6DCA4/FFFFFF.png" },
    { id: "5", name: "Edward Scissorhands", employeeId: "EMP005", department: "HR", role: "HR Business Partner", email: "edward.s@example.com", phone: "555-0105", startDate: "2019-11-05", status: "Inactive", avatar: "https://placehold.co/40x40/A4E6E1/FFFFFF.png" },
    { id: "6", name: "Fiona Apple", employeeId: "EMP006", department: "Support", role: "Support Lead", email: "fiona.a@example.com", phone: "555-0106", startDate: "2022-08-12", status: "Active" },
    { id: "7", name: "George Jetson", employeeId: "EMP007", department: "Finance", role: "Accountant", email: "george.j@example.com", phone: "555-0107", startDate: "2023-01-30", status: "Active" },
    { id: "8", name: "Harry Potter", employeeId: "EMP008", department: "Engineering", role: "Frontend Developer", email: "harry.p@example.com", phone: "555-0108", startDate: "2023-09-01", status: "Active" },
    { id: "9", name: "Ivy League", employeeId: "EMP009", department: "Sales", role: "Account Executive", email: "ivy.l@example.com", phone: "555-0109", startDate: "2022-06-15", status: "Inactive" },
    { id: "10", name: "Jack Sparrow", employeeId: "EMP010", department: "Marketing", role: "Content Creator", email: "jack.s@example.com", phone: "555-0110", startDate: "2024-01-10", status: "Active" },
  ];
  return data;
}

export default async function EmployeesPage() {
  const employees = await getEmployees();
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department))];
  const uniqueRoles = [...new Set(employees.map(emp => emp.role))];

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-semibold mb-6">Employee Directory</h1>
      <DataTable columns={columns} data={employees} uniqueDepartments={uniqueDepartments} uniqueRoles={uniqueRoles} />
    </div>
  );
}
