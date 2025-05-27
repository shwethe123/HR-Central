"use server";

import { analyzeFeedback as analyzeFeedbackFlow, type AnalyzeFeedbackInput, type AnalyzeFeedbackOutput } from "@/ai/flows/analyze-feedback";
import { z } from "zod";

const FormSchema = z.object({
  feedbackText: z.string().min(10, { message: "Feedback must be at least 10 characters long." }),
});

export type FormState = {
  message: string | null;
  analysisResult?: AnalyzeFeedbackOutput;
  errors?: {
    feedbackText?: string[];
  };
};

export async function submitFeedbackAnalysis(
  prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const validatedFields = FormSchema.safeParse({
    feedbackText: formData.get("feedbackText"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your input.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const input: AnalyzeFeedbackInput = {
      feedbackText: validatedFields.data.feedbackText,
    };
    const result = await analyzeFeedbackFlow(input);
    return {
      message: "Feedback analyzed successfully.",
      analysisResult: result,
    };
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    let errorMessage = "An unexpected error occurred while analyzing feedback.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: `Analysis failed: ${errorMessage}`,
    };
  }
}
