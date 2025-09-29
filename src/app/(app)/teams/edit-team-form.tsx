// src/app/(app)/teams/edit-team-form.tsx
'use client';

import { useEffect, useActionState, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { updateTeam, type UpdateTeamFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, Team } from '@/types';

const ClientEditTeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3, { message: "Team name must be at least 3 characters." }).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).min(1, { message: "Please select at least one member." }),
});

type EditTeamFormData = z.infer<typeof ClientEditTeamSchema>;

interface EditTeamFormProps {
  teamToEdit: Team;
  employees: Employee[];
  onFormSubmissionSuccess?: (updatedTeamId?: string) => void;
  className?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Changes
    </Button>
  );
}

export function EditTeamForm({ teamToEdit, employees, onFormSubmissionSuccess, className }: EditTeamFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateTeam, { message: null, errors: {}, success: false });
  
  const form = useForm<EditTeamFormData>({
    resolver: zodResolver(ClientEditTeamSchema),
    defaultValues: {
      id: teamToEdit.id,
      name: teamToEdit.name || '',
      description: teamToEdit.description || '',
      memberIds: teamToEdit.memberIds || [],
    },
  });
  
  useEffect(() => {
    form.reset({
      id: teamToEdit.id,
      name: teamToEdit.name || '',
      description: teamToEdit.description || '',
      memberIds: teamToEdit.memberIds || [],
    });
  }, [teamToEdit, form.reset]);

  useEffect(() => {
    if (state?.success && state.message) {
      toast({
        title: "Success",
        description: state.message,
      });
      if (onFormSubmissionSuccess) {
        onFormSubmissionSuccess(state.updatedTeamId); 
      }
    } else if (!state?.success && state?.message && (state.errors || state.message.includes("failed:"))) {
       toast({
        title: "Error Updating Team",
        description: state.errors?._form?.[0] || state.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [state, toast, onFormSubmissionSuccess]);
  
  const onSubmit = (data: EditTeamFormData) => {
    const formData = new FormData();
    formData.append('id', data.id);
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    data.memberIds.forEach(id => formData.append('memberIds', id));
    
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
      <input type="hidden" {...form.register('id')} />
      <div>
        <Label htmlFor="name-team-edit">Team Name</Label>
        <Input id="name-team-edit" {...form.register('name')} />
        {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="description-team-edit">Description (Optional)</Label>
        <Textarea id="description-team-edit" {...form.register('description')} rows={3} />
        {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
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
                        id={`member-edit-${employee.id}`}
                        checked={currentMemberIds.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          const newMemberIds = checked
                            ? [...currentMemberIds, employee.id]
                            : currentMemberIds.filter((id) => id !== employee.id);
                          field.onChange(newMemberIds);
                        }}
                      />
                      <Label htmlFor={`member-edit-${employee.id}`} className="font-normal cursor-pointer">
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
      </div>
      
      {state?.errors?._form && <p className="text-sm font-medium text-destructive mt-2">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
