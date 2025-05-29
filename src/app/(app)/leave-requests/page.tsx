
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
import { CalendarPlus, FileText, Loader2 } from 'lucide-react';
import { MOCK_EMPLOYEES_DATA } from '../employees/page'; 
import { updateLeaveRequestStatus, type UpdateLeaveStatusFormState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format as formatDateFns } from 'date-fns'; // Renamed to avoid conflict
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

// Helper to format dates, handling both string and Firestore Timestamp
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
  return formatDateFns(date, "MMMM d, yyyy");
};


async function getEmployees(): Promise<Employee[]> {
  return MOCK_EMPLOYEES_DATA;
}

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<LeaveRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeaveRequests = async () => {
    setIsLoading(true);
    try {
      const leaveRequestsCollectionRef = collection(db, "leaveRequests");
      const q = query(leaveRequestsCollectionRef, orderBy("requestedDate", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedRequests: LeaveRequest[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure dates are correctly handled if they are Timestamps
        const requestedDate = data.requestedDate instanceof Timestamp ? data.requestedDate.toDate().toISOString() : data.requestedDate;
        const processedDate = data.processedDate instanceof Timestamp ? data.processedDate.toDate().toISOString() : data.processedDate;
        
        return {
          id: doc.id,
          ...data,
          requestedDate,
          processedDate,
        } as LeaveRequest;
      });
      setLeaveRequests(fetchedRequests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch leave requests from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchInitialData() {
      const empData = await getEmployees();
      setEmployees(empData);
      await fetchLeaveRequests();
    }
    fetchInitialData();
  }, []);

  const handleFormSubmissionSuccess = (/* newRequestId: string */) => {
    // newRequestId is available from the action if needed for optimistic updates
    fetchLeaveRequests(); // Refetch the list
    setIsFormDialogOpen(false);
  };

  const handleUpdateRequestStatus = async (id: string, status: "Approved" | "Rejected", rejectionReason?: string) => {
    const result: UpdateLeaveStatusFormState = await updateLeaveRequestStatus(id, status, rejectionReason);
    if (result.success) {
      fetchLeaveRequests(); // Refetch the list
      toast({ title: "Status Updated", description: result.message });
    } else {
      toast({ title: "Error", description: result.message || "Failed to update status.", variant: "destructive" });
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequestDetails(request);
    setIsDetailsDialogOpen(true);
  };
  
  // Memoize columns only when handler functions change
  const columns = useMemo(() => getLeaveRequestColumns(handleUpdateRequestStatus, handleViewDetails), []);


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
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading leave requests...</p>
            </div>
          ) : (
            <LeaveRequestDataTable columns={columns} data={leaveRequests} />
          )}
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
                <span>{formatDate(selectedRequestDetails.startDate)}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">End Date:</span>
                <span>{formatDate(selectedRequestDetails.endDate)}</span>
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
                        "bg-yellow-100 text-yellow-700 border-yellow-300" 
                    }`}
                >
                    {selectedRequestDetails.status}
                </Badge>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="font-medium text-muted-foreground">Requested On:</span>
                <span>{formatDate(selectedRequestDetails.requestedDate)}</span>
              </div>
              {selectedRequestDetails.processedDate && (
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="font-medium text-muted-foreground">Processed On:</span>
                  <span>{formatDate(selectedRequestDetails.processedDate)}</span>
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
          <DialogDescription className="mt-4 text-right"> 
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>

    </div>
  );
}

