// src/app/(app)/teams/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateTeamForm } from "./create-team-form";
import { Users, PlusCircle, Loader2, MoreHorizontal, CalendarDays, Info, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { ScrollArea } from '@/components/ui/scroll-area';

const TEAMS_FETCH_LIMIT = 50;
const EMPLOYEES_FOR_FORM_FETCH_LIMIT = 150;

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
  const { isAdmin } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const { toast } = useToast();
  const [selectedTeamName, setSelectedTeamName] = useState<string>('all');

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

  const uniqueTeamNamesForFilter = useMemo(() => {
    return ['all', ...new Set(teams.map(team => team.name))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (selectedTeamName === 'all') {
      return teams;
    }
    return teams.filter(team => team.name === selectedTeamName);
  }, [teams, selectedTeamName]);

  const isLoading = isLoadingTeams || isLoadingEmployees;

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Manage Teams
        </h1>
        {isAdmin && (
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
        )}
      </div>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary/80"/>Filter by Team Name</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="filter-team-name" className="text-sm font-medium sr-only">Team Name</Label>
            <Select value={selectedTeamName} onValueChange={setSelectedTeamName}>
              <SelectTrigger id="filter-team-name" className="w-full md:w-[300px]">
                <SelectValue placeholder="Filter by Team Name" />
              </SelectTrigger>
              <SelectContent>
                {uniqueTeamNamesForFilter.map(name => (
                  <SelectItem key={name} value={name}>
                    {name === 'all' ? 'All Teams' : name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-10 bg-card shadow-md rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              No Teams Found
            </h3>
            <p className="text-muted-foreground mt-2">
              Get started by creating a new team.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsFormDialogOpen(true)} className="mt-4" disabled={isLoadingEmployees}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
              </Button>
            )}
        </div>
      ) : filteredTeams.length === 0 ? (
         <div className="text-center py-10 bg-card shadow-md rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">
              No Teams Found
            </h3>
            <p className="text-muted-foreground mt-2">
              No teams match the current filter.
            </p>
        </div>
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTeams.map(team => (
            <Card key={team.id} className="shadow-lg rounded-lg flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl text-primary">{team.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                            Created on: {formatDateFromTimestamp(team.createdAt)}
                        </CardDescription>
                    </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Team Actions</span>
                    </Button>
                </div>
                {team.description && (
                    <p className="text-sm text-muted-foreground pt-2">{team.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                 <h4 className="text-sm font-semibold mb-2">Members ({team.memberNames?.length || team.memberIds.length})</h4>
                 <ScrollArea className="h-40">
                     <div className="flex flex-wrap gap-2">
                        {(team.memberNames && team.memberNames.length > 0 ? team.memberNames : team.memberIds).map((item, index) => (
                             <Badge key={index} variant="secondary" className="font-normal text-sm py-1">
                                {item}
                            </Badge>
                        ))}
                    </div>
                 </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
