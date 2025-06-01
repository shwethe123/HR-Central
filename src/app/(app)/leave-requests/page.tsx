
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveRequestForm } from "./leave-request-form";
import { CalendarPlus, FileText, Loader2, User, ListChecks } from 'lucide-react';
import { updateLeaveRequestStatus, type UpdateLeaveStatusFormState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format as formatDateFns } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore'; // Added limit
import { useAuth } from '@/contexts/auth-context';

const LEAVE_REQUESTS_FETCH_LIMIT = 30; // Limit for initial fetch
const EMPLOYEES_FOR_FORM_FETCH_LIMIT = 100; // Limit for employees in the form dropdown

// Helper to format dates, handling both string and Firestore Timestamp
const formatDate = (dateInput: string | Timestamp | undefined): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    try {
        date = new Date(dateInput);
    } catch (e) {
        console.warn("Invalid date string encountered:", dateInput, e);
        return 'Invalid Date String';
    }
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) { 
    date = dateInput;
  }
   else {
    console.warn("Invalid date type encountered:", dateInput);
    return 'Invalid Date Type';
  }
  if (isNaN(date.getTime())) {
    console.warn("Date resulted in NaN:", dateInput);
    return 'Invalid Date';
  }
  return formatDateFns(date, "MMMM d, yyyy");
};

type ViewMode = "myRequests" | "allRequests";

export default function LeaveRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<LeaveRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ViewMode>("allRequests");
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const leaveRequestsCollectionRef = collection(db, "leaveRequests");
      // Apply limit to the query
      const q = query(leaveRequestsCollectionRef, orderBy("requestedDate", "desc"), limit(LEAVE_REQUESTS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedRequests: LeaveRequest[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const requestedDate = data.requestedDate;
        const processedDate = data.processedDate;
        
        return {
          id: doc.id,
          ...data,
          requestedDate,
          processedDate,
          startDate: data.startDate, 
          endDate: data.endDate,     
        } as LeaveRequest;
      });
      setLeaveRequests(fetchedRequests);
      if (querySnapshot.docs.length >= LEAVE_REQUESTS_FETCH_LIMIT) {
        toast({
          title: "Leave Request List Truncated",
          description: `Showing the first ${LEAVE_REQUESTS_FETCH_LIMIT} requests. Full list view requires pagination or 'load more'.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch leave requests from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  }, [toast]);

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      // Limit employees fetched for the form dropdown
      const q = query(employeesCollectionRef, orderBy("name", "asc"), limit(EMPLOYEES_FOR_FORM_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "",
          employeeId: data.employeeId || "",
          department: data.department || "",
          role: data.role || "",
          email: data.email || "",
          phone: data.phone || "",
          startDate: data.startDate || "", 
          status: data.status || "Active",
          avatar: data.avatar || "",
          company: data.company || "",
          salary: data.salary === undefined ? undefined : Number(data.salary),
        } as Employee;
      });
      setEmployees(fetchedEmployees);
      if (querySnapshot.docs.length >= EMPLOYEES_FOR_FORM_FETCH_LIMIT) {
          toast({
            title: "Employee Dropdown Truncated",
            description: `Employee selection for new requests shows the first ${EMPLOYEES_FOR_FORM_FETCH_LIMIT} employees.`,
            variant: "default",
          });
      }
    } catch (error) {
      console.error("Error fetching employees for leave request form:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employees for the form.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [toast]);

  useEffect(() => {
    async function fetchInitialData() {
      await fetchEmployees();
      await fetchLeaveRequests();
    }
    fetchInitialData();
  }, [fetchEmployees, fetchLeaveRequests]);

  useEffect(() => {
    if (user && employees.length > 0) {
      const loggedInEmployee = employees.find(emp => emp.email === user.email);
      if (loggedInEmployee) {
        setCurrentUserEmployeeId(loggedInEmployee.id);
      } else {
        setCurrentUserEmployeeId(null);
      }
    }
  }, [user, employees]);

  const handleFormSubmissionSuccess = () => {
    fetchLeaveRequests(); 
    setIsFormDialogOpen(false);
  };

  const handleUpdateRequestStatus = async (id: string, status: "Approved" | "Rejected", rejectionReason?: string) => {
    const originalRequests = [...leaveRequests];
    setLeaveRequests(prev =>
      prev.map(req =>
        req.id === id ? { 
            ...req, 
            status: status, 
            rejectionReason: status === "Rejected" ? rejectionReason : undefined, 
            processedDate: new Date().toISOString() 
        } : req
      )
    );

    const result: UpdateLeaveStatusFormState = await updateLeaveRequestStatus(id, status, rejectionReason);
    if (result.success && result.updatedRequestId && result.newStatus) {
        fetchLeaveRequests(); 
        toast({ title: "Status Updated", description: result.message });
    } else {
        setLeaveRequests(originalRequests);
        toast({ title: "Error", description: result.message || "Failed to update status.", variant: "destructive" });
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequestDetails(request);
    setIsDetailsDialogOpen(true);
  };
  
  const columns = useMemo(() => getLeaveRequestColumns(handleUpdateRequestStatus, handleViewDetails), [handleUpdateRequestStatus, handleViewDetails]);

  const filteredLeaveRequests = useMemo(() => {
    if (activeView === "myRequests") {
      if (!currentUserEmployeeId) return [];
      return leaveRequests.filter(req => req.employeeId === currentUserEmployeeId);
    }
    return leaveRequests;
  }, [activeView, leaveRequests, currentUserEmployeeId]);

  const isLoading = isLoadingRequests || isLoadingEmployees || authLoading;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <CalendarPlus className="mr-3 h-8 w-8 text-primary" />
          Leave Requests
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoadingEmployees || authLoading}>
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
            {isLoadingEmployees ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading employees...</p>
                </div>
            ) : (
                <LeaveRequestForm
                employees={employees}
                onFormSubmissionSuccess={handleFormSubmissionSuccess}
                />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)}>
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-4">
          <TabsTrigger value="allRequests">
            <ListChecks className="mr-2 h-4 w-4" /> All Requests
          </TabsTrigger>
          <TabsTrigger value="myRequests">
            <User className="mr-2 h-4 w-4" /> My Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="allRequests">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle>All Submitted Leave Requests</CardTitle>
                <CardDescription>View and manage all leave requests from employees.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading requests...</p>
                </div>
              ) : (
                <LeaveRequestDataTable columns={columns} data={filteredLeaveRequests} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="myRequests">
           <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle>My Submitted Leave Requests</CardTitle>
                <CardDescription>View your personal leave request history and status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading your requests...</p>
                </div>
              ) : !currentUserEmployeeId && !authLoading ? (
                <div className="py-10 text-center text-muted-foreground">
                  <p>Could not find an employee record associated with your account ({user?.email}).</p>
                  <p>Please contact HR if you believe this is an error.</p>
                </div>
              ) : (
                <LeaveRequestDataTable columns={columns} data={filteredLeaveRequests} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


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
    

    