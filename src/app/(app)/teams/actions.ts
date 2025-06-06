
// src/app/(app)/teams/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Employee } from '@/types';

const CreateTeamSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters." }).max(100, { message: "Team name is too long." }),
  description: z.string().max(500, { message: "Description is too long." }).optional().or(z.literal('')),
  memberIds: z.array(z.string().min(1, { message: "Invalid member ID." })).min(1, { message: "Team must have at least one member." }),
});

export type CreateTeamFormState = {
  message: string | null;
  errors?: {
    name?: string[];
    description?: string[];
    memberIds?: string[];
    _form?: string[];
  };
  success?: boolean;
  newTeamId?: string;
};

export async function createTeam(
  prevState: CreateTeamFormState | undefined,
  formData: FormData
): Promise<CreateTeamFormState> {
  const name = formData.get('name');
  const description = formData.get('description');
  const memberIds = formData.getAll('memberIds').filter(id => typeof id === 'string' && id.length > 0) as string[];

  const validatedFields = CreateTeamSchema.safeParse({
    name,
    description,
    memberIds,
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { name: teamName, description: teamDescription, memberIds: validatedMemberIds } = validatedFields.data;

  try {
    // Optionally, fetch member names for easier display (denormalization)
    // This adds a bit of overhead on creation but can simplify reads
    const memberNames: string[] = [];
    for (const memberId of validatedMemberIds) {
      const empDocRef = doc(db, "employees", memberId);
      const empDocSnap = await getDoc(empDocRef);
      if (empDocSnap.exists()) {
        memberNames.push((empDocSnap.data() as Employee).name || "Unknown Member");
      } else {
        memberNames.push("Unknown Member (ID not found)");
      }
    }


    const docRef = await addDoc(collection(db, 'teams'), {
      name: teamName,
      description: teamDescription || '',
      memberIds: validatedMemberIds,
      memberNames: memberNames, // Store names if fetched
      createdAt: serverTimestamp(),
    });

    revalidatePath('/teams'); 

    return {
      message: `Team "${teamName}" created successfully.`,
      success: true,
      newTeamId: docRef.id,
    };
  } catch (error) {
    console.error("Error creating team in Firestore:", error);
    let errorMessage = "An unexpected error occurred while creating the team.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Creating team failed: ${errorMessage}`,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
