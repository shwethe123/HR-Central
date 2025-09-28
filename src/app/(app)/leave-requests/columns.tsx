
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LeaveRequest } from "@/types";
import { ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, AlertTriangle, ExternalLink, KeyRound } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React from "react";
import { format as formatDateFns } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const ACTION_SECRET_CODE = "hr123"; 

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
    accessorKey: "leaveType",
    header: "Leave Type",
    cell: ({ row }) => <Badge variant="secondary" className="whitespace-nowrap">{row.original.leaveType}</Badge>,
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
      const { toast } = useToast();
      
      const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false);
      const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
      const [secretCode, setSecretCode] = React.useState("");
      const [rejectionReason, setRejectionReason] = React.useState("");

      const handleApproveConfirm = () => {
        if (secretCode !== ACTION_SECRET_CODE) {
          toast({
            title: "Incorrect Code",
            description: "The secret code entered was incorrect. Approval denied.",
            variant: "destructive",
          });
          setSecretCode(""); // Clear the code for next attempt
          return;
        }
        onUpdateRequestStatus(request.id, "Approved");
        toast({
          title: "Request Approved",
          description: "The leave request has been approved successfully.",
          variant: "default",
        });
        setIsApproveDialogOpen(false);
        setSecretCode("");
      };

      const handleRejectConfirm = () => {
        if (secretCode !== ACTION_SECRET_CODE) {
          toast({
            title: "Incorrect Code",
            description: "The secret code entered was incorrect. Rejection denied.",
            variant: "destructive",
          });
          setSecretCode(""); 
          return;
        }
        if (!rejectionReason.trim()) {
          toast({
            title: "Reason Required",
            description: "Please provide a reason for rejecting this request.",
            variant: "destructive",
          });
          return;
        }
        onUpdateRequestStatus(request.id, "Rejected", rejectionReason);
        toast({
          title: "Request Rejected",
          description: "The leave request has been rejected.",
          variant: "default",
        });
        setIsRejectDialogOpen(false);
        setSecretCode("");
        setRejectionReason("");
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
                <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsApproveDialogOpen(true); setSecretCode(''); }}>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Leave Request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Please enter the secret code to confirm approval.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2 space-y-2">
                      <Label htmlFor="approveSecretCode">Secret Code</Label>
                      <Input
                        id="approveSecretCode"
                        type="password"
                        placeholder="Enter secret code..."
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => { setIsApproveDialogOpen(false); setSecretCode(''); }}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApproveConfirm} className="bg-primary hover:bg-primary/90">
                        Confirm Approval
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsRejectDialogOpen(true); setSecretCode(''); setRejectionReason('');}} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Leave Request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Please provide a secret code and a reason for rejecting this leave request.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2 space-y-4">
                      <div>
                        <Label htmlFor="rejectSecretCode">Secret Code</Label>
                        <Input
                          id="rejectSecretCode"
                          type="password"
                          placeholder="Enter secret code..."
                          value={secretCode}
                          onChange={(e) => setSecretCode(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rejectionReason">Rejection Reason</Label>
                        <Textarea
                          id="rejectionReason"
                          placeholder="Enter reason for rejection (required)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => { setIsRejectDialogOpen(false); setSecretCode(''); setRejectionReason(''); }}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRejectConfirm}
                        className="bg-destructive hover:bg-destructive/90"
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
