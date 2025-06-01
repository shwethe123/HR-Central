
// src/app/(app)/documents/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { UploadDocumentForm } from "./upload-document-form";
import { PackageOpen, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { DocumentsDataTable } from './data-table'; // New import
import { getDocumentColumns } from './columns'; // New import

const DOCUMENTS_FETCH_LIMIT = 50; 

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
          title: "Document List Potentially Truncated",
          description: `Showing the first ${DOCUMENTS_FETCH_LIMIT} documents. Full list view might require pagination or 'load more' if implemented in DataTable.`,
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

  const columns = useMemo(() => getDocumentColumns(), []);
  
  const uniqueCategories = useMemo(() => {
    return [...new Set(documents.map(doc => doc.category))].sort();
  }, [documents]);

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
      ) : (
        <DocumentsDataTable columns={columns} data={documents} uniqueCategories={uniqueCategories} />
      )}
    </div>
  );
}
