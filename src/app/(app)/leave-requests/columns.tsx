
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


const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("en-US", { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
};

const statusBadgeVariant = (status: LeaveRequest["status"]) => {
  switch (status) {
    case "Pending":
      return "outline"; // Yellow-ish or neutral
    case "Approved":
      return "default"; // Green or primary
    case "Rejected":
      return "destructive"; // Red
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
        <Badge variant={statusBadgeVariant(status)} className="font-semibold flex items-center">
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
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const request = row.original;
      const [rejectionReason, setRejectionReason] = React.useState("");

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
                <DropdownMenuItem onClick={() => onUpdateRequestStatus(request.id, "Approved")}>
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
                        placeholder="Enter reason for rejection (optional)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                            onUpdateRequestStatus(request.id, "Rejected", rejectionReason);
                            setRejectionReason("");
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
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
