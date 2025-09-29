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
import { EditTeamForm } from "./edit-team-form"; // Import EditTeamForm
import { Users, PlusCircle, Loader2, MoreHorizontal, Edit, ListFilter } from 'lucide-react';
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
  const [isCreateFormDialogOpen, setIsCreateFormDialogOpen] = useState(false);
  const [isEditFormDialogOpen, setIsEditFormDialogOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
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

  const handleCreateFormSuccess = () => {
    fetchTeams();
    setIsCreateFormDialogOpen(false);
  };
  
  const handleEditFormSuccess = () => {
    fetchTeams();
    setIsEditFormDialogOpen(false);
    setTeamToEdit(null);
  };

  const handleEditClick = (team: Team) => {
    setTeamToEdit(team);
    setIsEditFormDialogOpen(true);
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
          <Dialog open={isCreateFormDialogOpen} onOpenChange={setIsCreateFormDialogOpen}>
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
                    onFormSubmissionSuccess={handleCreateFormSuccess}
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
        <Card className="text-center py-10 shadow-md rounded-lg">
            <CardContent>
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground">
                No Teams Found
              </h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating a new team.
              </p>
              {isAdmin && (
                <Button onClick={() => setIsCreateFormDialogOpen(true)} className="mt-4" disabled={isLoadingEmployees}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
                </Button>
              )}
            </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Team List</CardTitle>
            <CardDescription>A list of all created teams and their members.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Team Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="w-[150px]">Created Date</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No teams match the current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeams.map(team => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium text-primary">{team.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate" title={team.description}>
                          {team.description || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(team.memberNames && team.memberNames.length > 0 ? team.memberNames : team.memberIds).map((item, index) => (
                              <Badge key={index} variant="secondary" className="font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateFromTimestamp(team.createdAt)}
                        </TableCell>
                         <TableCell className="text-right">
                            {isAdmin ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(team)}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Team</span>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Team Actions (Admin only)</span>
                                </Button>
                            )}
                         </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Team Dialog */}
      {teamToEdit && (
        <Dialog open={isEditFormDialogOpen} onOpenChange={setIsEditFormDialogOpen}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                <DialogTitle>Edit Team: {teamToEdit.name}</DialogTitle>
                <DialogDescription>
                    Update the details for this team.
                </DialogDescription>
                </DialogHeader>
                {isLoadingEmployees ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Loading form data...</p>
                    </div>
                ) : (
                    <EditTeamForm
                        teamToEdit={teamToEdit}
                        employees={employees}
                        onFormSubmissionSuccess={handleEditFormSuccess}
                    />
                )}
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
