"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LeaveRequest } from "@/types";
import { ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { format as formatDateFns } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

// --- IMPORTANT ---
// This is a CLIENT-SIDE secret code. It is NOT secure for protecting sensitive operations
// as it can be found in the browser's JavaScript source code.
// For true security, authorization should be handled server-side.
const ACTION_SECRET_CODE = "hr123"; // Replace with your desired secret code

const formatDate = (dateInput: string | Timestamp | undefined): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else {
    return 'Invalid Date';
  }
  if (isNaN(date.getTime())) return 'Invalid Date';
  return formatDateFns(date, "MMM d, yyyy");
};

const statusBadgeVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Pending":
      return "outline"; 
    case "Approved":
      return "default"; 
    case "Rejected":
      return "destructive"; 
    default:
      return "secondary";
  }
};

const statusIcon = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Pending":
      return <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />;
    case "Approved":
      return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />;
    case "Rejected":
      return <XCircle className="mr-2 h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

export const getLeaveRequestColumns = (
  onUpdateRequestStatus: (id: string, status: "Approved" | "Rejected", rejectionReason?: string) => void,
  onViewDetails: (request: LeaveRequest) => void
): ColumnDef<LeaveRequest>[] => [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => {
      return <span className="text-muted-foreground">{row.index + 1}</span>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "employeeName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Employee <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.original.employeeName}</div>,
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.reason}>
        {row.original.reason}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge 
          variant={statusBadgeVariant(status)} 
          className={`font-semibold flex items-center
            ${status === "Approved" ? "bg-green-100 text-green-700 border-green-300" :
              status === "Rejected" ? "bg-red-100 text-red-700 border-red-300" :
              status === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-300" : ""
            }`}
        >
          {statusIcon(status)}
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "requestedDate",
    header: "Requested On",
    cell: ({ row }) => formatDate(row.original.requestedDate),
    sortingFn: 'datetime', 
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const request = row.original;
      const [rejectionReason, setRejectionReason] = React.useState("");
      const { toast } = useToast();

      const handleActionWithSecretCode = async (action: () => void) => {
        try {
          const enteredCode = window.prompt("Please enter the secret code to proceed:");
          
          if (enteredCode === null) {
            // User cancelled the prompt
            return;
          }
          
          if (enteredCode === ACTION_SECRET_CODE) {
            action();
          } else {
            toast({
              title: "Incorrect Code",
              description: "The secret code entered was incorrect. Action denied.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "An error occurred while processing your request.",
            variant: "destructive",
          });
        }
      };

      const handleApprove = () => {
        handleActionWithSecretCode(() => {
          onUpdateRequestStatus(request.id, "Approved");
          toast({
            title: "Request Approved",
            description: "The leave request has been approved successfully.",
            variant: "default",
          });
        });
      };

      const handleRejectConfirm = () => {
        handleActionWithSecretCode(() => {
          if (!rejectionReason.trim()) {
            toast({
              title: "Reason Required",
              description: "Please provide a reason for rejecting this request.",
              variant: "destructive",
            });
            return;
          }
          
          onUpdateRequestStatus(request.id, "Rejected", rejectionReason);
          setRejectionReason("");
          toast({
            title: "Request Rejected",
            description: "The leave request has been rejected.",
            variant: "default",
          });
        });
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(request)}>
              <ExternalLink className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {request.status === "Pending" && (
              <>
                <DropdownMenuItem onClick={handleApprove}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Leave Request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Please provide a reason for rejecting this leave request. This reason will be recorded.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Label htmlFor="rejectionReason" className="sr-only">Rejection Reason</Label>
                      <Textarea
                        id="rejectionReason"
                        placeholder="Enter reason for rejection (required)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRejectConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white focus:bg-red-700 focus:ring-red-500"
                      >
                        Confirm Rejection
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];