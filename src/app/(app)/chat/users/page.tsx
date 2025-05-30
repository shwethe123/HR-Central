
// src/app/(app)/chat/users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Employee } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Users } from 'lucide-react';
import { getOneToOneConversationId } from '@/lib/chatUtils';
import { useRouter } from 'next/navigation';

export default function SelectUserForChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const router = useRouter();

  const fetchEmployees = useCallback(async () => {
    if (!user) return; // Don't fetch if user is not logged in
    setIsLoadingEmployees(true);
    try {
      const employeesCollectionRef = collection(db, "employees");
      const q = query(employeesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedEmployees: Employee[] = [];
      querySnapshot.forEach(doc => {
        // Exclude the current user from the list
        if (doc.id !== user.uid) {
          fetchedEmployees.push({ id: doc.id, ...doc.data() } as Employee);
        }
      });
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error fetching employees for chat selection:", error);
      // Optionally, show a toast message
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchEmployees();
    }
  }, [authLoading, user, fetchEmployees]);

  const handleStartChat = (selectedEmployee: Employee) => {
    if (!user || !selectedEmployee.id) {
      console.error("Current user or selected employee ID is missing.");
      return;
    }
    const conversationId = getOneToOneConversationId(user.uid, selectedEmployee.id);
    // Encode the name for the URL query parameter
    const chatTargetName = encodeURIComponent(selectedEmployee.name);
    router.push(`/chat/${conversationId}?name=${chatTargetName}`);
  };

  if (authLoading || isLoadingEmployees) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">
          {authLoading ? "Authenticating..." : "Loading users..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <p className="text-muted-foreground">Please log in to start a chat.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" />
            Start a New Chat
          </CardTitle>
          <CardDescription>Select an employee to start a one-on-one conversation.</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 && !isLoadingEmployees ? (
            <p className="text-center text-muted-foreground py-8">No other employees found to chat with.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {employees.map((emp) => (
                  <Card 
                    key={emp.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleStartChat(emp)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={emp.avatar || undefined} alt={emp.name} data-ai-hint="person avatar" />
                          <AvatarFallback>{emp.name?.substring(0, 1).toUpperCase() || 'E'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.role || 'Employee'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Chat with ${emp.name}`}>
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
