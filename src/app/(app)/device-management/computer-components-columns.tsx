// src/app/(app)/device-management/computer-components-columns.tsx
"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import type { ComputerComponent, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isValid, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

const statusBadgeVariant = (status: ComputerComponent['status']) => {
  switch (status) {
    case 'In Use': return 'default';
    case 'In Stock': return 'secondary';
    case 'Damaged': return 'destructive';
    case 'Retired': return 'outline';
    default: return 'secondary';
  }
};

const multiColumnFilterFn: FilterFn<any> = (row, columnId, value, addMeta) => {
    const brand: string = row.getValue('brand');
    const model: string = row.getValue('model');
    const searchTerm = value.toLowerCase();
    
    return brand?.toLowerCase().includes(searchTerm) || model?.toLowerCase().includes(searchTerm);
};


export const getComputerComponentColumns = (
    employees: Employee[],
    onEdit: (component: ComputerComponent) => void,
    onDelete: (component: ComputerComponent) => void
): ColumnDef<ComputerComponent>[] => {
  const { isAdmin } = useAuth();
  
  const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));

  return [
    { accessorKey: "componentType", header: "Type", filterFn: 'includes' },
    { accessorKey: "brand", header: "Brand", filterFn: multiColumnFilterFn },
    { accessorKey: "model", header: "Model", filterFn: multiColumnFilterFn },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={statusBadgeVariant(row.original.status)}>{row.original.status}</Badge>,
    },
    {
      accessorKey: "assignedToEmployeeId",
      header: "Assigned To",
      cell: ({ row }) => employeeMap.get(row.original.assignedToEmployeeId || '') || <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      accessorKey: "purchaseDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Purchase Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.original.purchaseDate;
        if (!dateStr) return <span className="text-muted-foreground">N/A</span>;
        const date = parseISO(dateStr);
        return isValid(date) ? format(date, "MMM d, yyyy") : 'Invalid Date';
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const component = row.original;
        if (!isAdmin) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(component)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(component)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
