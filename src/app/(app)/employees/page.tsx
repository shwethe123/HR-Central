
import type { Employee } from "@/types";
import { getColumns } from "./columns";
import { DataTable } from "./data-table";

// Exporting MOCK_EMPLOYEES_DATA so it can be used by other pages (e.g., leave requests)
export const MOCK_EMPLOYEES_DATA: Employee[] = [
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

async function getEmployees(): Promise<Employee[]> {
  // In a real app, you'd fetch this from an API
  // For now, returning the exported mock data
  return MOCK_EMPLOYEES_DATA;
}

export default async function EmployeesPage() {
  const employees = await getEmployees();
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department))].sort();
  const uniqueRoles = [...new Set(employees.map(emp => emp.role))].sort();
  const uniqueCompanies = [...new Set(employees.map(emp => emp.company).filter(Boolean) as string[])].sort();


  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-semibold mb-6">Employee Directory</h1>
      <DataTable 
        columnGenerator={getColumns} 
        data={employees} 
        uniqueDepartments={uniqueDepartments} 
        uniqueRoles={uniqueRoles} 
        uniqueCompanies={uniqueCompanies}
      />
    </div>
  );
}
