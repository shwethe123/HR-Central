// src/app/(app)/resignations/add-comment-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addCommentToResignation, type AddCommentFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ClientCommentSchema = z.object({
  commentText: z.string().min(1, { message: "Comment cannot be empty." }).max(1000),
});

type CommentFormData = z.infer<typeof ClientCommentSchema>;

interface AddCommentFormProps {
  resignationId: string;
  onFormSubmissionSuccess?: () => void;
  className?: string;
}

function SubmitButton() {
  const { pending } = useActionState(addCommentToResignation, { message: null, success: false });
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Comment
    </Button>
  );
}

export function AddCommentForm({ resignationId, onFormSubmissionSuccess, className }: AddCommentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(addCommentToResignation, { message: null, success: false });

  const form = useForm<CommentFormData>({
    resolver: zodResolver(ClientCommentSchema),
    defaultValues: {
      commentText: '',
    },
  });

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Success", description: state.message });
      form.reset();
      if (onFormSubmissionSuccess) onFormSubmissionSuccess();
    } else if (state?.message && !state.success) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);

  const onSubmit = (data: CommentFormData) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to add a comment.", variant: "destructive" });
        return;
    }
    const formData = new FormData();
    formData.append('resignationId', resignationId);
    formData.append('commentText', data.commentText);
    formData.append('authorName', user.displayName || "Unknown Admin");
    
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 pt-2", className)}>
      <div>
        <Label htmlFor="commentText">New Comment</Label>
        <Textarea
          id="commentText"
          {...form.register('commentText')}
          rows={4}
          placeholder="Type your comment here..."
        />
        {form.formState.errors.commentText && <p className="text-sm text-destructive mt-1">{form.formState.errors.commentText.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Comment
        </Button>
      </div>
    </form>
  );
}
