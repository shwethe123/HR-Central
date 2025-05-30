
"use client";

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle, Edit3, KeyRound, Mail, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  const userDisplayName = user.displayName || "N/A";
  const userEmail = user.email || "N/A";
  const avatarFallback = userDisplayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <header className="flex items-center space-x-3 mb-8">
        <UserCircle className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your account details.</p>
        </div>
      </header>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={user.photoURL || undefined} alt={userDisplayName} data-ai-hint="person avatar" />
            <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{userDisplayName}</CardTitle>
          <CardDescription>{userEmail}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">Display Name</Label>
            <div className="flex items-center mt-1">
              <UserIcon className="h-5 w-5 text-muted-foreground mr-3" />
              <Input id="displayName" type="text" value={userDisplayName} readOnly className="bg-muted/50 border-muted/50 cursor-not-allowed" />
            </div>
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
             <div className="flex items-center mt-1">
              <Mail className="h-5 w-5 text-muted-foreground mr-3" />
              <Input id="email" type="email" value={userEmail} readOnly className="bg-muted/50 border-muted/50 cursor-not-allowed" />
            </div>
          </div>
          <Button variant="outline" className="w-full" disabled>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage your account security and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full" disabled>
            <KeyRound className="mr-2 h-4 w-4" /> Change Password (Coming Soon)
          </Button>
           {/* Add other account actions here, e.g., delete account */}
        </CardContent>
      </Card>
    </div>
  );
}
