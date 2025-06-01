
// src/app/(app)/documents/upload-document-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { saveDocumentMetadata, type UploadDocumentFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { storage, auth as firebaseAuth } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Image from 'next/image'; // For preview

const DOCUMENT_CATEGORIES = [
    "Image Gallery", 
    "Company Policy", 
    "HR Template", 
    "Financial Report", 
    "Training Material", 
    "Onboarding Doc", 
    "Presentation", 
    "Spreadsheet",
    "Legal", 
    "Archive (ZIP)", 
    "Miscellaneous"
];

const ClientDocumentSchema = z.object({
  file: (typeof window !== 'undefined' ? z.instanceof(FileList) : z.any())
    .refine((files) => files?.length === 1, { message: 'A single file is required.' })
    .refine((files) => files?.[0]?.size <= 10 * 1024 * 1024, { message: 'File size must be 10MB or less.' }) // Max 10MB
    .transform(fileList => fileList?.[0]), 
  category: z.string().min(1, { message: "Category is required." }),
  description: z.string().max(500).optional(),
});

type DocumentFormData = z.infer<typeof ClientDocumentSchema>;

interface UploadDocumentFormProps {
  onFormSubmissionSuccess?: (newDocumentId?: string) => void;
  className?: string;
}

function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending: isActionPending } = useFormStatus();
  const isDisabled = isUploading || isActionPending;
  
  let buttonText = "Save Document";
  if (isUploading) {
    buttonText = "Uploading File...";
  } else if (isActionPending) {
    buttonText = "Saving Metadata...";
  }

  return (
    <Button type="submit" disabled={isDisabled} className="w-full sm:w-auto">
      {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
}

export function UploadDocumentForm({ onFormSubmissionSuccess, className }: UploadDocumentFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(saveDocumentMetadata, { message: null, errors: {}, success: false });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);


  const form = useForm<DocumentFormData>({
    resolver: zodResolver(ClientDocumentSchema),
    defaultValues: {
      file: undefined,
      category: '',
      description: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('file', event.target.files, { shouldValidate: true });
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    } else {
      form.setValue('file', undefined, { shouldValidate: true });
      setFilePreview(null);
    }
  };

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      setUploadProgress(0);
      setFilePreview(null);
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newDocumentId); 
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Saving Document",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);
  
  const onSubmit = async (data: DocumentFormData) => {
    const fileToUpload = data.file;
    if (!fileToUpload || !firebaseAuth.currentUser) {
        toast({ title: "File or user missing", description: "Please select a file and ensure you are logged in.", variant: "destructive"});
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const sRef = storageRef(storage, `company-documents/${firebaseAuth.currentUser.uid}-${Date.now()}-${fileToUpload.name}`);
    const uploadTask = uploadBytesResumable(sRef, fileToUpload);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        toast({
          title: "File Upload Failed",
          description: error.message || "Could not upload file to storage.",
          variant: "destructive",
        });
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => { 
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setIsUploading(false); 

          const metadataFormData = new FormData();
          metadataFormData.append('fileName', fileToUpload.name);
          metadataFormData.append('fileType', fileToUpload.type);
          metadataFormData.append('fileSize', String(fileToUpload.size));
          metadataFormData.append('category', data.category);
          if (data.description) metadataFormData.append('description', data.description);
          metadataFormData.append('downloadURL', downloadURL);
          metadataFormData.append('storagePath', uploadTask.snapshot.ref.fullPath);
          
          startTransition(() => {
            formAction(metadataFormData);
          });

        } catch (error) {
            console.error("Error getting download URL or calling action:", error);
            toast({ title: "Error", description: "Failed to finalize document upload.", variant: "destructive"});
            setIsUploading(false);
            setUploadProgress(0);
        }
      }
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
      <div>
        <Label htmlFor="file-upload">Document File</Label>
        <Input 
          id="file-upload" 
          type="file" 
          onChange={handleFileChange} // Use controlled file input
          ref={fileInputRef}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.zip,application/zip,application/x-zip-compressed,text/plain,text/csv"
        />
        {form.formState.errors.file && <p className="text-sm text-destructive mt-1">{form.formState.errors.file.message}</p>}
        {state?.errors?.file && <p className="text-sm text-destructive mt-1">{state.errors.file.join(', ')}</p>}
        {filePreview && (
          <div className="mt-2 p-2 border rounded-md inline-block bg-muted">
            <Image src={filePreview} alt="Selected preview" width={100} height={100} className="rounded-md object-cover" data-ai-hint="upload preview"/>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Upload Progress:</Label>
          <Progress value={uploadProgress} className="w-full h-2" />
          <p className="text-xs text-muted-foreground text-right">{Math.round(uploadProgress)}%</p>
        </div>
      )}

      <div>
        <Label htmlFor="category-doc">Category</Label>
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} defaultValue="">
              <SelectTrigger id="category-doc">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.category && <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>}
        {state?.errors?.category && <p className="text-sm text-destructive mt-1">{state.errors.category.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="description-doc">Description (Optional)</Label>
        <Textarea id="description-doc" {...form.register('description')} rows={3} placeholder="Briefly describe the document..."/>
        {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
        {state?.errors?.description && <p className="text-sm text-destructive mt-1">{state.errors.description.join(', ')}</p>}
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton isUploading={isUploading} />
      </div>
    </form>
  );
}

