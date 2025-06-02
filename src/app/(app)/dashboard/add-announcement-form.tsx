
// src/app/(app)/dashboard/add-announcement-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { addAnnouncement, type AddAnnouncementFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const ClientAnnouncementSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(150),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }).max(5000),
  authorName: z.string().min(2).max(100).optional().or(z.literal('')),
});

type AnnouncementFormData = z.infer<typeof ClientAnnouncementSchema>;

interface AddAnnouncementFormProps {
  onFormSubmissionSuccess?: (newAnnouncementId?: string) => void;
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Publish Announcement
    </Button>
  );
}

export function AddAnnouncementForm({ onFormSubmissionSuccess, className }: AddAnnouncementFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user to prefill author name
  const [state, formAction] = useActionState(addAnnouncement, { message: null, errors: {}, success: false });

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(ClientAnnouncementSchema),
    defaultValues: {
      title: '',
      content: '',
      authorName: user?.displayName || 'HR Department', // Prefill with current user's name or default
    },
  });

   useEffect(() => {
    // If user changes after form is initialized, update default authorName
    if (user && !form.getValues('authorName')) {
      form.setValue('authorName', user.displayName || 'HR Department');
    }
  }, [user, form]);


  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset({ 
        title: '', 
        content: '', 
        authorName: user?.displayName || 'HR Department' 
      });
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newAnnouncementId);
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Creating Announcement",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess, user]);

  const onSubmit = (data: AnnouncementFormData) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('authorName', data.authorName || (user?.displayName || 'HR Department'));

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6 p-1", className)}>
      <div>
        <Label htmlFor="title-announcement">Title</Label>
        <Input id="title-announcement" {...form.register('title')} placeholder="Enter announcement title" />
        {form.formState.errors.title && <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>}
        {state?.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="content-announcement">Content</Label>
        <Textarea
          id="content-announcement"
          {...form.register('content')}
          rows={8}
          placeholder="Write the announcement details here..."
        />
        {form.formState.errors.content && <p className="text-sm text-destructive mt-1">{form.formState.errors.content.message}</p>}
        {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}
      </div>
      
      <div>
        <Label htmlFor="authorName-announcement">Author Name</Label>
        <Input id="authorName-announcement" {...form.register('authorName')} placeholder="e.g., HR Department or Your Name"/>
        {form.formState.errors.authorName && <p className="text-sm text-destructive mt-1">{form.formState.errors.authorName.message}</p>}
        {state?.errors?.authorName && <p className="text-sm text-destructive mt-1">{state.errors.authorName.join(', ')}</p>}
      </div>

      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
