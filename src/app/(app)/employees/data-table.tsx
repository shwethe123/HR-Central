
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, PlusCircle, ListFilter, FileDown } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddEmployeeForm } from "./add-employee-form";
import { EmployeeDetailsDialog } from "./employee-details-dialog"; 
import type { Employee } from "@/types"; 
import Papa from "papaparse";
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

interface DataTableProps<TData extends Employee, TValue> { 
  columnGenerator: (
    onViewDetails: (employee: TData) => void, 
    onRefreshData: () => Promise<void> | void,
    onEditEmployee: (employee: TData) => void // New prop
  ) => ColumnDef<TData, TValue>[];
  data: TData[];
  uniqueDepartments: string[];
  uniqueRoles: string[];
  uniqueCompanies: string[];
  onRefreshData: () => Promise<void> | void; // Callback to refresh data
  onEditEmployee: (employee: TData) => void; // New prop
}

export function DataTable<TData extends Employee, TValue>({
  columnGenerator,
  data,
  uniqueDepartments,
  uniqueRoles,
  uniqueCompanies,
  onRefreshData,
  onEditEmployee, // Destructure new prop
}: DataTableProps<TData, TValue>) {
  const { isAdmin } = useAuth(); // Get admin status
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = React.useState(false);

  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = React.useState<TData | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);

  const handleViewDetails = React.useCallback((employee: TData) => {
    setSelectedEmployeeForDetails(employee);
    setIsDetailsDialogOpen(true);
  }, []);

  const memoizedColumns = React.useMemo(
    () => columnGenerator(
      handleViewDetails,
      onRefreshData || (() => { 
        console.warn("DataTable: onRefreshData prop was undefined or not a function. Using a no-op function.");
        return Promise.resolve(); 
      }),
      onEditEmployee // Pass the new prop
    ),
    [columnGenerator, handleViewDetails, onRefreshData, onEditEmployee] // Add onEditEmployee to dependencies
  );

  const table = useReactTable({
    data,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    filterFns: {
      fuzzy: () => false, 
    },
    globalFilterFn: "fuzzy",
  });

  const handleExport = () => {
    const rowsToExport = table.getFilteredRowModel().rows.map(row => {
      const original = row.original as Employee;
      return {
        "Name": original.name,
        "Employee ID": original.employeeId,
        "Company": original.company,
        "Department": original.department,
        "Role": original.role,
        "Email": original.email,
        "Phone": original.phone,
        "Start Date": original.startDate,
        "Status": original.status,
        "Salary": original.salary ? original.salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A',
      };
    });

    if (rowsToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    const csv = Papa.unparse(rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "employees.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddEmployeeSuccess = async (newEmployeeId?: string) => {
    setIsAddEmployeeDialogOpen(false);
    if (newEmployeeId) { // Or just always refresh
      if (typeof onRefreshData === 'function') {
        await onRefreshData(); // Call the refresh function passed from parent
      } else {
        console.warn("DataTable: onRefreshData is not a function in handleAddEmployeeSuccess. Cannot refresh data.");
      }
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <Input
          placeholder="Filter by name..." 
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            table.getColumn("name")?.setFilterValue(event.target.value);
          }}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <ListFilter className="mr-2 h-4 w-4" /> Filters <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px]">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Label htmlFor="company-filter" className="text-sm font-medium">Company</Label>
                <Select
                  value={(table.getColumn("company")?.getFilterValue() as string) ?? "all"}
                  onValueChange={(value) => table.getColumn("company")?.setFilterValue(value === "all" ? undefined : value)}
                >
                  <SelectTrigger id="company-filter" className="w-full mt-1">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {uniqueCompanies.map(comp => <SelectItem key={comp} value={comp}>{comp}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="p-2">
                <Label htmlFor="department-filter" className="text-sm font-medium">Department</Label>
                <Select
                  value={(table.getColumn("department")?.getFilterValue() as string) ?? "all"}
                  onValueChange={(value) => table.getColumn("department")?.setFilterValue(value === "all" ? undefined : value)}
                >
                  <SelectTrigger id="department-filter" className="w-full mt-1">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2">
                <Label htmlFor="role-filter" className="text-sm font-medium">Role</Label>
                 <Select
                  value={(table.getColumn("role")?.getFilterValue() as string) ?? "all"}
                  onValueChange={(value) => table.getColumn("role")?.setFilterValue(value === "all" ? undefined : value)}
                >
                  <SelectTrigger id="role-filter" className="w-full mt-1">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="p-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                 <Select
                  value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
                  onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}
                >
                  <SelectTrigger id="status-filter" className="w-full mt-1">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/([A-Z])/g, ' $1').trim()}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
          {isAdmin && (
            <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to add a new employee to the directory.
                  </DialogDescription>
                </DialogHeader>
                <AddEmployeeForm 
                  uniqueDepartments={uniqueDepartments} 
                  uniqueRoles={uniqueRoles}
                  uniqueCompanies={uniqueCompanies}
                  onFormSubmissionSuccess={handleAddEmployeeSuccess} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="rounded-md border shadow-sm bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={memoizedColumns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
      <EmployeeDetailsDialog 
        employee={selectedEmployeeForDetails}
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  );
}

