
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle, Edit3, KeyRound, Mail, User as UserIconLucide, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage, auth as firebaseAuth } from '@/lib/firebase'; // Import auth for updateProfile
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { updateUserFirestorePhoto, type UpdateUserPhotoResponseState } from './actions';

export default function ProfilePage() {
  const { user, loading: authLoading, setUser: setAuthUser } = useAuth(); // Get setUser to update context if needed
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (user?.photoURL) {
      setCurrentPhotoURL(user.photoURL);
    } else {
      setCurrentPhotoURL(null);
    }
  }, [user?.photoURL]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewURL(null);
    }
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile || !firebaseAuth.currentUser) {
      toast({ title: "No file selected or user not found.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const oldPhotoURL = firebaseAuth.currentUser.photoURL; // Store old URL to delete if new upload succeeds

    try {
      const timestamp = Date.now();
      const fileName = `${firebaseAuth.currentUser.uid}-${timestamp}-${selectedFile.name}`;
      const imageRef = storageRef(storage, `profile-pictures/${fileName}`);
      
      const uploadTask = uploadBytesResumable(imageRef, selectedFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Optional: Handle progress (e.g., for a progress bar)
          // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // console.log('Upload is ' + progress + '% done');
        },
        (error) => { // Handle unsuccessful uploads
          console.error("Storage Upload Error:", error);
          toast({
            title: "Image Upload Failed",
            description: error.message || "Could not upload image to storage.",
            variant: "destructive",
          });
          setIsUploading(false);
        },
        async () => { // Handle successful uploads on complete
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at", downloadURL);

            // 1. Update Firebase Auth profile
            if (firebaseAuth.currentUser) {
              await updateProfile(firebaseAuth.currentUser, { photoURL: downloadURL });
              console.log("Firebase Auth profile updated.");
               // Manually update context to reflect change immediately if onAuthStateChanged is slow
              // This is a bit of a hack, ideally onAuthStateChanged handles this.
              if (setAuthUser) { // Check if setAuthUser is available from context
                  const updatedUserFromAuth = { ...firebaseAuth.currentUser, photoURL: downloadURL } as FirebaseUser;
                  setAuthUser(updatedUserFromAuth); 
              }
              setCurrentPhotoURL(downloadURL); // Update local state for immediate preview change
            }

            // 2. Update Firestore via Server Action
            const firestoreUpdateResult: UpdateUserPhotoResponseState = await updateUserFirestorePhoto({
              userId: firebaseAuth.currentUser.uid,
              newPhotoURL: downloadURL,
            });

            if (firestoreUpdateResult.success) {
              toast({
                title: "Profile Photo Updated!",
                description: "Your new profile photo has been saved.",
                variant: "default",
                className: "bg-green-500 text-white",
                action: <CheckCircle className="text-white" />
              });
              // If there was an old photo and it's different from the new one, delete it from Storage
              if (oldPhotoURL && oldPhotoURL !== downloadURL) {
                try {
                  const oldImageRef = storageRef(storage, oldPhotoURL);
                  await deleteObject(oldImageRef);
                  console.log("Old profile picture deleted from storage.");
                } catch (deleteError: any) {
                  // Non-critical error, log it but don't fail the whole process
                  console.warn("Failed to delete old profile picture from storage:", deleteError.message);
                }
              }
            } else {
              throw new Error(firestoreUpdateResult.message || "Failed to update photo in database.");
            }

            setSelectedFile(null);
            setPreviewURL(null); // Clear preview
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input

          } catch (updateError: any) {
            console.error("Error during profile update (Auth/Firestore):", updateError);
            toast({
              title: "Update Failed",
              description: updateError.message || "Could not update profile photo.",
              variant: "destructive",
            });
             // Potentially revert Auth photoURL if Firestore update failed? Or handle more gracefully.
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error("Outer Upload Error:", error);
      toast({
        title: "Upload Initialization Failed",
        description: error.message || "Could not start image upload.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };


  if (authLoading) {
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
  const displayPhotoURL = previewURL || currentPhotoURL;

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
            <AvatarImage src={displayPhotoURL || undefined} alt={userDisplayName} data-ai-hint="person avatar"/>
            <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{userDisplayName}</CardTitle>
          <CardDescription>{userEmail}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">Display Name</Label>
            <div className="flex items-center mt-1">
              <UserIconLucide className="h-5 w-5 text-muted-foreground mr-3" />
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
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile Details (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Change Profile Photo</CardTitle>
          <CardDescription>Upload a new image for your profile avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-image-upload">Select new photo</Label>
            <Input
              id="profile-image-upload"
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {previewURL && (
              <div className="mt-4 p-2 border rounded-md inline-block bg-muted">
                <p className="text-xs text-muted-foreground mb-1">New photo preview:</p>
                <Image src={previewURL} alt="Selected preview" width={100} height={100} className="rounded-md object-cover" data-ai-hint="person avatar" />
              </div>
            )}
          </div>
          <Button onClick={handleUploadAndSave} disabled={!selectedFile || isUploading} className="w-full">
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isUploading ? 'Uploading...' : 'Upload & Save Photo'}
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
        </CardContent>
      </Card>
    </div>
  );
}
