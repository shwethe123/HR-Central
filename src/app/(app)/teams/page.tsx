
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
import { CreateTeamForm } from "./create-team-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, PlusCircle, Loader2, User, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

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
      const q = query(teamsCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedTeams: Team[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "Unnamed Team",
          description: data.description || "",
          memberIds: data.memberIds || [],
          memberNames: data.memberNames || [], // Get pre-fetched names
          createdAt: data.createdAt, // Keep as Timestamp or string
        } as Team;
      });
      setTeams(fetchedTeams);
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
      const q = query(employeesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Employee));
      setEmployees(fetchedEmployees);
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

      {isLoadingTeams ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader>
            <CardTitle className="text-2xl">No Teams Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first team.
            </p>
            <Button onClick={() => setIsFormDialogOpen(true)} disabled={isLoadingEmployees}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="shadow-lg rounded-lg flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate" title={team.name}>{team.name}</span>
                  {/* Placeholder for team actions */}
                  {/* 
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Team</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> 
                  */}
                </CardTitle>
                <CardDescription className="h-10 overflow-y-auto text-sm">
                  {team.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                  Members ({team.memberIds.length})
                </h4>
                {team.memberIds.length > 0 ? (
                   <ScrollArea className="h-32">
                    <ul className="space-y-1.5">
                      {(team.memberNames && team.memberNames.length === team.memberIds.length ? team.memberNames : team.memberIds).map((item, index) => {
                        const memberName = team.memberNames && team.memberNames[index] ? team.memberNames[index] : `ID: ${item}`;
                        const employeeDetails = employees.find(emp => emp.id === team.memberIds[index]);
                        return (
                          <li key={team.memberIds[index]} className="flex items-center gap-2 text-sm">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={employeeDetails?.avatar || undefined} alt={employeeDetails?.name} data-ai-hint="person avatar"/>
                              <AvatarFallback className="text-xs">
                                {employeeDetails ? employeeDetails.name.substring(0,1).toUpperCase() : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate" title={memberName}>{memberName}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No members in this team yet.</p>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground border-t pt-3">
                Created: {formatDateFromTimestamp(team.createdAt)}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
