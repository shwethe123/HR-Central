
// src/app/(app)/teams/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Team, Employee } from "@/types";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CreateTeamForm } from "./create-team-form";
import { Users, PlusCircle, Loader2, MoreHorizontal, CalendarDays, Info } from 'lucide-react'; // Added CalendarDays, Info
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge'; // Added Badge

const TEAMS_FETCH_LIMIT = 20;
const EMPLOYEES_FOR_FORM_FETCH_LIMIT = 100;

const formatDateFromTimestamp = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date String';
      return format(date, "MMM d, yyyy");
    } catch (e) {
      return 'Invalid Date String';
    }
  }
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), "MMM d, yyyy");
  }
  return 'Invalid Date Type';
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    try {
      const teamsCollectionRef = collection(db, "teams");
      const q = query(teamsCollectionRef, orderBy("createdAt", "desc"), limit(TEAMS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedTeams: Team[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "Unnamed Team",
          description: data.description || "",
          memberIds: data.memberIds || [],
          memberNames: data.memberNames || [],
          createdAt: data.createdAt,
        } as Team;
      });
      setTeams(fetchedTeams);
      if (querySnapshot.docs.length >= TEAMS_FETCH_LIMIT) {
        toast({
          title: "Team List Truncated",
          description: `Showing the first ${TEAMS_FETCH_LIMIT} teams.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teams from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTeams(false);
    }
  }, [toast]);

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      const q = query(employeesCollectionRef, orderBy("name", "asc"), limit(EMPLOYEES_FOR_FORM_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Employee));
      setEmployees(fetchedEmployees);
       if (querySnapshot.docs.length >= EMPLOYEES_FOR_FORM_FETCH_LIMIT) {
          toast({
            title: "Employee Dropdown Truncated",
            description: `Employee selection for new teams shows the first ${EMPLOYEES_FOR_FORM_FETCH_LIMIT} employees.`,
            variant: "default",
          });
      }
    } catch (error) {
      console.error("Error fetching employees for teams form:", error);
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
    fetchTeams();
    fetchEmployees();
  }, [fetchTeams, fetchEmployees]);

  const handleFormSubmissionSuccess = () => {
    fetchTeams(); 
    setIsFormDialogOpen(false);
  };

  const isLoading = isLoadingTeams || isLoadingEmployees;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Manage Teams
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoadingEmployees}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new team.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmployees ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading employees...</p>
                </div>
            ) : (
                <CreateTeamForm
                  employees={employees}
                  onFormSubmissionSuccess={handleFormSubmissionSuccess}
                />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-10 bg-card shadow-md rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No Teams Found</h3>
            <p className="text-muted-foreground mt-2">Get started by creating a new team.</p>
            <Button onClick={() => setIsFormDialogOpen(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl font-semibold truncate" title={team.name}>
                    {team.name}
                  </CardTitle>
                  {/* Placeholder for future actions */}
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Team Actions</span>
                  </Button>
                </div>
                {team.description && (
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2 pt-1" title={team.description}>
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-0">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <span>{team.memberIds.length} Member{team.memberIds.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                  <span>Created: {formatDateFromTimestamp(team.createdAt)}</span>
                </div>
                {team.memberNames && team.memberNames.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Members:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {team.memberNames.slice(0, 5).map((name, index) => (
                        <Badge key={index} variant="secondary" className="font-normal">{name}</Badge>
                      ))}
                      {team.memberNames.length > 5 && (
                        <Badge variant="outline" className="font-normal">+{team.memberNames.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3">
                {/* Placeholder for a "View Details" button or similar */}
                <Button variant="outline" size="sm" className="w-full" disabled>View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
