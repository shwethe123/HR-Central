
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Employee } from "@/types";
import { ArrowUpDown, MoreHorizontal, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteEmployee, type DeleteEmployeeFormState } from "./actions";
import { useActionState, startTransition } from "react";

export const getColumns = (
    onViewDetails: (employee: Employee) => void,
    onRefreshData: () => Promise<void> | void
  ): ColumnDef<Employee>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "index",
    header: "#",
    cell: ({ row }) => {
      return <span className="text-muted-foreground">{row.index + 1}</span>;
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={employee.avatar || undefined} alt={employee.name} data-ai-hint="person avatar" />
            <AvatarFallback>{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{employee.name}</span>
        </div>
      );
    }
  },
  {
    accessorKey: "employeeId",
    header: "Employee ID",
  },
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    }
  },
  {
    accessorKey: "department",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Department
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    }
  },
  {
    accessorKey: "role",
    header: "Role",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    }
  },
  {
    accessorKey: "gender",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Gender
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const gender = row.original.gender || "N/A";
      return <span>{gender}</span>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    }
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={status === "Active" ? "default" : "destructive"} className={`font-semibold ${status === "Active" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}`}>{status}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    }
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
        const dateValue = row.getValue("startDate");
        if (typeof dateValue === 'string' && dateValue) {
            try {
                const date = new Date(dateValue);
                // Check if date is valid after parsing
                if (isNaN(date.getTime())) {
                    return "Invalid Date";
                }
                return new Intl.DateTimeFormat("en-US", { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
            } catch (e) {
                return "Invalid Date";
            }
        }
        return "N/A";
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      const { isAdmin } = useAuth();
      const { toast } = useToast();
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

      const initialDeleteState: DeleteEmployeeFormState = { message: null, errors: {}, success: false };
      const [deleteState, formAction] = useActionState(deleteEmployee, initialDeleteState);

      React.useEffect(() => {
        if (deleteState?.success && deleteState.message) {
          toast({
            title: "Success",
            description: deleteState.message,
          });
          setIsDeleteDialogOpen(false);
          if (typeof onRefreshData === 'function') {
            onRefreshData(); // Call refresh data on success
          } else {
            console.error("onRefreshData is not a function in columns.tsx. Value:", onRefreshData);
            toast({
              title: "Action Succeeded",
              description: "Employee deleted. The list may not update automatically. Please refresh if needed.",
              variant: "default",
            });
          }
        } else if (!deleteState?.success && deleteState?.message && (deleteState.errors || deleteState.message.includes("failed:"))) {
          toast({
            title: "Error Deleting Employee",
            description: deleteState.errors?._form?.[0] || deleteState.message || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      }, [deleteState, toast, onRefreshData]);

      const handleDeleteConfirm = () => {
        const formData = new FormData();
        formData.append('employeeId', employee.id);
        startTransition(() => {
            formAction(formData);
        });
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(employee.email)}
              >
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewDetails(employee)}>
                View details
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={deleteState?.pending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete employee
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                    Confirm Deletion
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete employee "{employee.name}" (ID: {employee.employeeId})? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteState?.pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={deleteState?.pending}
                  >
                    {deleteState?.pending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      );
    },
  },
];

