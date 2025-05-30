
// src/app/(app)/teams/create-team-form.tsx
'use client';

import { useEffect, useActionState, startTransition, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { createTeam, type CreateTeamFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';

const ClientTeamSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters." }).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).min(1, { message: "Please select at least one member." }),
});

type TeamFormData = z.infer<typeof ClientTeamSchema>;

interface CreateTeamFormProps {
  employees: Employee[];
  onFormSubmissionSuccess?: (newTeamId?: string) => void;
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create Team
    </Button>
  );
}

export function CreateTeamForm({ employees, onFormSubmissionSuccess, className }: CreateTeamFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(createTeam, { message: null, errors: {}, success: false });
  
  const form = useForm<TeamFormData>({
    resolver: zodResolver(ClientTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      memberIds: [],
    },
  });

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      form.reset(); 
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.newTeamId); 
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Creating Team",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, form, onFormSubmissionSuccess]);
  
  const onSubmit = (data: TeamFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    data.memberIds.forEach(id => formData.append('memberIds', id));
    
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
      <div>
        <Label htmlFor="name-team">Team Name</Label>
        <Input id="name-team" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
        {state?.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name.join(', ')}</p>}
      </div>

      <div>
        <Label htmlFor="description-team">Description (Optional)</Label>
        <Textarea id="description-team" {...form.register('description')} rows={3} />
        {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
        {state?.errors?.description && <p className="text-sm text-destructive mt-1">{state.errors.description.join(', ')}</p>}
      </div>

      <div>
        <Label>Select Team Members</Label>
        <ScrollArea className="h-48 mt-2 rounded-md border p-4">
          <div className="space-y-2">
            {employees.map((employee) => (
              <Controller
                key={employee.id}
                name="memberIds"
                control={form.control}
                render={({ field }) => {
                  const currentMemberIds = field.value || [];
                  return (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${employee.id}`}
                        checked={currentMemberIds.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          const newMemberIds = checked
                            ? [...currentMemberIds, employee.id]
                            : currentMemberIds.filter((id) => id !== employee.id);
                          field.onChange(newMemberIds);
                        }}
                      />
                      <Label htmlFor={`member-${employee.id}`} className="font-normal cursor-pointer">
                        {employee.name} ({employee.role})
                      </Label>
                    </div>
                  );
                }}
              />
            ))}
          </div>
        </ScrollArea>
        {form.formState.errors.memberIds && <p className="text-sm text-destructive mt-1">{form.formState.errors.memberIds.message}</p>}
        {state?.errors?.memberIds && <p className="text-sm text-destructive mt-1">{state.errors.memberIds.join(', ')}</p>}
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
