// src/app/(app)/resignations/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Resignation, Employee } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddResignationForm } from "./add-resignation-form";
import { UserMinus, PlusCircle, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format, differenceInDays, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const RESIGNATIONS_FETCH_LIMIT = 50;
const EMPLOYEES_FETCH_LIMIT = 150;

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, "MMM d, yyyy");
  } catch (e) {
    return 'Invalid Date String';
  }
};

const eligibilityVariant = (eligibility: Resignation['rehireEligibility']) => {
  switch (eligibility) {
    case 'Eligible': return 'default';
    case 'Ineligible': return 'destructive';
    case 'Conditional': return 'secondary';
    default: 'outline';
  }
};

export default function ResignationsPage() {
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const resignationsQuery = query(collection(db, "resignations"), orderBy("createdAt", "desc"), limit(RESIGNATIONS_FETCH_LIMIT));
      const employeesQuery = query(collection(db, "employees"), orderBy("name", "asc"), limit(EMPLOYEES_FETCH_LIMIT));

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
          <CardTitle>Resignation History</CardTitle>
           <div className="relative mt-4 max-w-md">
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
            <div className="space-y-4">
              {filteredResignations.map(res => {
                const noticeDate = new Date(res.noticeDate);
                const resignationDate = new Date(res.resignationDate);
                let noticeDays: number | null = null;
                if (isValid(noticeDate) && isValid(resignationDate)) {
                  noticeDays = differenceInDays(resignationDate, noticeDate);
                }

                return (
                  <div key={res.id} className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/50">
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{res.employeeName}</p>
                      <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span>Notice: {formatDate(res.noticeDate)}</span>
                        <span>Last Day: {formatDate(res.resignationDate)}</span>
                        {noticeDays !== null && noticeDays >= 0 && (
                          <span className="font-medium text-primary">({noticeDays} days notice)</span>
                        )}
                      </div>
                      {res.reason && <p className="text-sm italic text-muted-foreground">Reason: "{res.reason}"</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={eligibilityVariant(res.rehireEligibility)}>
                        {res.rehireEligibility} for Re-hire
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
