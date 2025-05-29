
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { LeaveRequest, Employee } from "@/types";
import { getLeaveRequestColumns } from "./columns";
import { LeaveRequestDataTable } from "./data-table";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeaveRequestForm } from "./leave-request-form";
import { CalendarPlus, FileText } from 'lucide-react';
import { MOCK_EMPLOYEES_DATA } from '../employees/page'; // Import mock employees
import { updateLeaveRequestStatus, type UpdateLeaveStatusFormState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

// Mock data for leave requests
const MOCK_LEAVE_REQUESTS_DATA: LeaveRequest[] = [
  { id: "LR001", employeeId: "1", employeeName: "Alice Wonderland", startDate: "2024-08-01", endDate: "2024-08-05", reason: "Vacation to explore new places.", status: "Pending", requestedDate: "2024-07-15" },
  { id: "LR002", employeeId: "3", employeeName: "Charlie Brown", startDate: "2024-07-20", endDate: "2024-07-22", reason: "Personal reasons, need a short break.", status: "Approved", requestedDate: "2024-07-10", processedBy: "HR", processedDate: "2024-07-11" },
  { id: "LR003", employeeId: "4", employeeName: "Diana Prince", startDate: "2024-08-10", endDate: "2024-08-10", reason: "Doctor's appointment.", status: "Pending", requestedDate: "2024-07-18" },
  { id: "LR004", employeeId: "2", employeeName: "Bob The Builder", startDate: "2024-09-01", endDate: "2024-09-10", reason: "Attending a workshop for skill development.", status: "Rejected", requestedDate: "2024-07-01", processedBy: "HR", processedDate: "2024-07-05", rejectionReason: "Team workload too high during this period." },
  { id: "LR005", employeeId: "5", employeeName: "Edward Scissorhands", startDate: "2024-07-25", endDate: "2024-07-26", reason: "Family emergency.", status: "Approved", requestedDate: "2024-07-24", processedBy: "HR", processedDate: "2024-07-24" },
];


async function getEmployees(): Promise<Employee[]> {
  // In a real app, fetch from an API or shared service
  return MOCK_EMPLOYEES_DATA;
}

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS_DATA);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<LeaveRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchEmployees() {
      const data = await getEmployees();
      setEmployees(data);
    }
    fetchEmployees();
  }, []);

  const handleFormSubmissionSuccess = (newRequest: LeaveRequest) => {
    setLeaveRequests(prevRequests => [newRequest, ...prevRequests]);
    setIsFormDialogOpen(false);
  };

  const handleUpdateRequestStatus = async (id: string, status: "Approved" | "Rejected", rejectionReason?: string) => {
    const result: UpdateLeaveStatusFormState = await updateLeaveRequestStatus(id, status, rejectionReason);
    if (result.success && result.updatedRequestId && result.newStatus) {
      setLeaveRequests(prev =>
        prev.map(req =>
          req.id === result.updatedRequestId ? { ...req, status: result.newStatus!, rejectionReason: result.newStatus === "Rejected" ? rejectionReason : undefined, processedDate: new Date().toISOString().split('T')[0] } : req
        )
      );
      toast({ title: "Status Updated", description: result.message });
    } else {
      toast({ title: "Error", description: result.message || "Failed to update status.", variant: "destructive" });
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequestDetails(request);
    setIsDetailsDialogOpen(true);
  };

  const columns = useMemo(() => getLeaveRequestColumns(handleUpdateRequestStatus, handleViewDetails), [handleUpdateRequestStatus, handleViewDetails]);


  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <CalendarPlus className="mr-3 h-8 w-8 text-primary" />
          Leave Requests Management
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 h-4 w-4" /> Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Submit New Leave Request</DialogTitle>
              <DialogDescription>
                Fill in the details below to submit a new leave request.
              </DialogDescription>
            </DialogHeader>
            <LeaveRequestForm
              employees={employees}
              onFormSubmissionSuccess={handleFormSubmissionSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
            <CardTitle>All Leave Requests</CardTitle>
            <CardDescription>View and manage all submitted leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
            <LeaveRequestDataTable columns={columns} data={leaveRequests} />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequestDetails && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">Employee:</span>
                <span>{selectedRequestDetails.employeeName} ({selectedRequestDetails.employeeId})</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">Start Date:</span>
                <span>{format(new Date(selectedRequestDetails.startDate), "MMMM d, yyyy")}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">End Date:</span>
                <span>{format(new Date(selectedRequestDetails.endDate), "MMMM d, yyyy")}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                <span className="font-medium text-muted-foreground">Reason:</span>
                <p className="whitespace-pre-wrap">{selectedRequestDetails.reason}</p>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">Status:</span>
                <Badge
                    variant={
                        selectedRequestDetails.status === "Approved" ? "default" :
                        selectedRequestDetails.status === "Rejected" ? "destructive" : "outline"
                    }
                    className={`font-semibold ${
                        selectedRequestDetails.status === "Approved" ? "bg-green-100 text-green-700 border-green-300" :
                        selectedRequestDetails.status === "Rejected" ? "bg-red-100 text-red-700 border-red-300" :
                        "bg-yellow-100 text-yellow-700 border-yellow-300" // Example for Pending
                    }`}
                >
                    {selectedRequestDetails.status}
                </Badge>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">Requested On:</span>
                <span>{format(new Date(selectedRequestDetails.requestedDate), "MMMM d, yyyy")}</span>
              </div>
              {selectedRequestDetails.processedDate && (
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="font-medium text-muted-foreground">Processed On:</span>
                  <span>{format(new Date(selectedRequestDetails.processedDate), "MMMM d, yyyy")}</span>
                </div>
              )}
              {selectedRequestDetails.status === "Rejected" && selectedRequestDetails.rejectionReason && (
                <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                  <span className="font-medium text-muted-foreground">Rejection Reason:</span>
                  <p className="whitespace-pre-wrap text-destructive">{selectedRequestDetails.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogDescription className="mt-4 text-right"> {/* DialogDescription used for footer content as per original */}
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>

    </div>
  );
}
