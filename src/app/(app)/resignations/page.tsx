// src/app/(app)/resignations/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Resignation, Employee, ResignationComment } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AddResignationForm } from "./add-resignation-form";
import { AddCommentForm } from "./add-comment-form";
import { UserMinus, PlusCircle, Loader2, Search, MoreHorizontal, MessageSquare, FileText, Calendar, Info, StickyNote, GitPullRequest, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format, differenceInDays, isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const RESIGNATIONS_FETCH_LIMIT = 50;
const EMPLOYEES_FETCH_LIMIT = 150; // This is no longer used for the employee query, but kept for reference

const formatDate = (dateInput: string | Timestamp | undefined): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  if (typeof dateInput === 'string') {
    try {
      date = parseISO(dateInput);
    } catch (e) { return 'Invalid Date String'; }
  } else if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else {
    return 'Invalid Date Type';
  }
  if (!isValid(date)) return 'Invalid Date';
  return format(date, "MMM d, yyyy, h:mm a");
};


const eligibilityVariant = (eligibility: Resignation['rehireEligibility']) => {
  switch (eligibility) {
    case 'Eligible': return 'default';
    case 'Ineligible': return 'destructive';
    case 'Conditional': return 'secondary';
    default: return 'outline' as "default" | "destructive" | "secondary" | "outline" | null | undefined;
  }
};

const EligibilityIcon = ({ eligibility }: { eligibility: Resignation['rehireEligibility'] }) => {
    switch (eligibility) {
        case 'Eligible': return <UserCheck className="mr-2 h-4 w-4 text-green-500" />;
        case 'Ineligible': return <UserX className="mr-2 h-4 w-4 text-red-500" />;
        case 'Conditional': return <GitPullRequest className="mr-2 h-4 w-4 text-yellow-500" />;
        default: return null;
    }
};

export default function ResignationsPage() {
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResignation, setSelectedResignation] = useState<Resignation | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const resignationsQuery = query(collection(db, "resignations"), orderBy("createdAt", "desc"), limit(RESIGNATIONS_FETCH_LIMIT));
      // Fetch all employees without limit for the dropdown
      const employeesQuery = query(collection(db, "employees"), orderBy("name", "asc"));

      const [resignationsSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(resignationsQuery),
        getDocs(employeesQuery),
      ]);

      const fetchedResignations: Resignation[] = resignationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resignation));
      const fetchedEmployees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      
      setResignations(fetchedResignations);
      setEmployees(fetchedEmployees);

    } catch (error) {
      console.error("Error fetching resignations or employees:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmissionSuccess = () => {
    fetchData();
    setIsFormDialogOpen(false);
  };
  
  const handleCommentSubmissionSuccess = () => {
    fetchData();
    setIsCommentDialogOpen(false);
    setSelectedResignation(null);
  };
  
  const handleViewDetails = (resignation: Resignation) => {
    setSelectedResignation(resignation);
    setIsDetailsDialogOpen(true);
  };

  const handleAddComment = (resignation: Resignation) => {
    setSelectedResignation(resignation);
    setIsCommentDialogOpen(true);
  };

  const filteredResignations = useMemo(() => {
    if (!searchTerm) {
      return resignations;
    }
    return resignations.filter(res =>
      res.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resignations, searchTerm]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Resignation Data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <UserMinus className="mr-3 h-8 w-8 text-primary" />
          Resignation Management
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={employees.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Resignation Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>New Resignation Record</DialogTitle>
              <DialogDescription>
                Select the employee and fill in their resignation details.
              </DialogDescription>
            </DialogHeader>
            <AddResignationForm
              employees={employees}
              onFormSubmissionSuccess={handleFormSubmissionSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='mb-3'>Resignation History</CardTitle>
           <div className="relative max-w-md mt-6">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by employee name..."
              className="w-full rounded-lg bg-background pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredResignations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {searchTerm ? "No records match your search." : "No resignation records found."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResignations.map(res => {
                const noticeDate = new Date(res.noticeDate);
                const resignationDate = new Date(res.resignationDate);
                const hasComments = res.comments && res.comments.length > 0;

                return (
                  <Card key={res.id} className={cn("flex flex-col", hasComments && "border-orange-500")}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{res.employeeName}</CardTitle>
                            <CardDescription>
                              Resigned: {format(resignationDate, "MMM d, yyyy")}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleViewDetails(res)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleAddComment(res)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Add Comment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                       <div className="text-sm text-muted-foreground">
                          <p><strong>Notice Date:</strong> {format(noticeDate, "MMM d, yyyy")}</p>
                          <p><strong>Last Day:</strong> {format(resignationDate, "MMM d, yyyy")}</p>
                       </div>
                       <Badge variant={eligibilityVariant(res.rehireEligibility)}>
                          {res.rehireEligibility} for Re-hire
                       </Badge>
                    </CardContent>
                    <CardFooter>
                       {hasComments && <p className="text-xs text-orange-600 font-semibold">{res.comments.length} comment(s)</p>}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl">Resignation Details</DialogTitle>
            <DialogDescription>
              Full record for <span className="font-semibold text-primary">{selectedResignation?.employeeName}</span>.
            </DialogDescription>
          </DialogHeader>
          {selectedResignation && (
            <div className="space-y-6 text-sm">
                <Card className="bg-muted/50">
                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                         <div>
                            <p className="font-medium text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" />Notice Date</p>
                            <p className="font-semibold">{format(new Date(selectedResignation.noticeDate), "PPP")}</p>
                        </div>
                        <div>
                            <p className="font-medium text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" />Resignation Date</p>
                            <p className="font-semibold">{format(new Date(selectedResignation.resignationDate), "PPP")}</p>
                        </div>
                    </CardContent>
                </Card>

              <div className="space-y-3">
                 <p className="font-medium text-muted-foreground flex items-center"><EligibilityIcon eligibility={selectedResignation.rehireEligibility} />Re-hire Eligibility</p>
                <Badge variant={eligibilityVariant(selectedResignation.rehireEligibility)} className="w-fit text-sm py-1">
                    {selectedResignation.rehireEligibility}
                </Badge>
              </div>
              <Separator />
               <div className="space-y-2">
                 <p className="font-medium text-muted-foreground flex items-center"><Info className="mr-2 h-4 w-4" />Reason for Leaving</p>
                 <p className="pl-6 whitespace-pre-wrap">{selectedResignation.reason || 'N/A'}</p>
              </div>
               <div className="space-y-2">
                 <p className="font-medium text-muted-foreground flex items-center"><StickyNote className="mr-2 h-4 w-4" />HR Notes</p>
                 <p className="pl-6 whitespace-pre-wrap">{selectedResignation.notes || 'No notes provided.'}</p>
              </div>
              
              <Separator />

               <div className="space-y-3">
                 <p className="font-medium text-muted-foreground flex items-center"><MessageSquare className="mr-2 h-4 w-4" />Comments</p>
                 <ScrollArea className="h-36 w-full rounded-md border p-3">
                    {selectedResignation.comments && selectedResignation.comments.length > 0 ? (
                        <div className="space-y-4">
                        {selectedResignation.comments.slice().reverse().map((comment, index) => (
                            <div key={index} className="text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-foreground">{comment.authorName}</p>
                                    <p className="text-muted-foreground/80">
                                        {formatDate(comment.createdAt)}
                                    </p>
                                </div>
                                <p className="whitespace-pre-wrap p-2 bg-muted rounded-md">{comment.text}</p>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-10">No comments yet.</p>
                    )}
                 </ScrollArea>
              </div>
            </div>
          )}
           <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Comment Dialog */}
      {selectedResignation && (
        <Dialog open={isCommentDialogOpen} onOpenChange={(isOpen) => {
            setIsCommentDialogOpen(isOpen);
            if (!isOpen) setSelectedResignation(null);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Comment for {selectedResignation.employeeName}</DialogTitle>
                    <DialogDescription>
                        This comment will be added to the resignation record.
                    </DialogDescription>
                </DialogHeader>
                <AddCommentForm
                    resignationId={selectedResignation.id}
                    onFormSubmissionSuccess={handleCommentSubmissionSuccess}
                />
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
