
// src/app/(app)/documents/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { DocumentMetadata } from "@/types";
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
import { UploadDocumentForm } from "./upload-document-form";
import { FileText, PlusCircle, Loader2, Download, PackageOpen, FileQuestion, Tag, CalendarDays, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const DOCUMENTS_FETCH_LIMIT = 20; // Limit for initial fetch

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <FileQuestion className="h-5 w-5 text-blue-500" />; // Or a specific image icon
  if (fileType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (fileType.includes('wordprocessingml') || fileType === 'application/msword') return <FileText className="h-5 w-5 text-blue-700" />;
  if (fileType.includes('spreadsheetml') || fileType === 'application/vnd.ms-excel') return <FileText className="h-5 w-5 text-green-600" />;
  return <FileQuestion className="h-5 w-5 text-gray-500" />;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const documentsCollectionRef = collection(db, "documents");
      const q = query(documentsCollectionRef, orderBy("uploadedAt", "desc"), limit(DOCUMENTS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const fetchedDocs: DocumentMetadata[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DocumentMetadata));
      setDocuments(fetchedDocs);

      if (querySnapshot.docs.length >= DOCUMENTS_FETCH_LIMIT) {
        toast({
          title: "Document List Truncated",
          description: `Showing the first ${DOCUMENTS_FETCH_LIMIT} documents. Implement pagination or 'load more' for full list.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch documents from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFormSubmissionSuccess = () => {
    fetchDocuments(); 
    setIsFormDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-2 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold flex items-center">
          <PackageOpen className="mr-3 h-8 w-8 text-primary" />
          Document Management
        </h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Select a file, choose a category, and add an optional description.
              </DialogDescription>
            </DialogHeader>
            <UploadDocumentForm onFormSubmissionSuccess={handleFormSubmissionSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="text-center py-10 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl">No Documents Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get started by uploading your first company document.
            </p>
            <Button onClick={() => setIsFormDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="shadow-lg rounded-lg flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-shrink min-w-0">
                        {getFileIcon(doc.fileType)}
                        <CardTitle className="text-base font-semibold truncate" title={doc.fileName}>
                            {doc.fileName}
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap capitalize">{doc.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1.5 flex-grow pt-0 pb-3">
                {doc.description && (
                  <p className="line-clamp-2" title={doc.description}>
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Uploaded: {doc.uploadedAt instanceof Timestamp ? format(doc.uploadedAt.toDate(), "MMM d, yyyy") : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5" />
                    <span className="truncate" title={doc.uploadedByName}>By: {doc.uploadedByName}</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <PackageOpen className="h-3.5 w-3.5" />
                    <span>Size: {formatFileSize(doc.fileSize)}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3">
                <Button 
                  variant="default" 
                  size="sm" 
                  asChild 
                  className="w-full"
                >
                  <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer" download={doc.fileName}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
