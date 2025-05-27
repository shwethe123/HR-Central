// src/ai/flows/analyze-feedback.ts
'use server';

/**
 * @fileOverview AI-powered tool to categorize employee feedback and suggest improvements.
 *
 * - analyzeFeedback - A function that analyzes employee feedback, categorizes it into themes, and suggests improvements.
 * - AnalyzeFeedbackInput - The input type for the analyzeFeedback function.
 * - AnalyzeFeedbackOutput - The return type for the analyzeFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFeedbackInputSchema = z.object({
  feedbackText: z.string().describe('The employee feedback text to analyze.'),
});
export type AnalyzeFeedbackInput = z.infer<typeof AnalyzeFeedbackInputSchema>;

const AnalyzeFeedbackOutputSchema = z.object({
  themes: z
    .array(
      z.object({
        theme: z.string().describe('The category or theme of the feedback.'),
        sentiment: z.string().describe('The sentiment of the feedback (positive, negative, neutral).'),
        examples: z.array(z.string()).describe('Example sentences from the feedback that match the theme.'),
      })
    )
    .describe('The categorized themes and examples from the feedback.'),
  suggestions: z.array(z.string()).describe('Suggestions for improvements based on the feedback.'),
});
export type AnalyzeFeedbackOutput = z.infer<typeof AnalyzeFeedbackOutputSchema>;

export async function analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackOutput> {
  return analyzeFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeFeedbackPrompt',
  input: {schema: AnalyzeFeedbackInputSchema},
  output: {schema: AnalyzeFeedbackOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing employee feedback and providing actionable insights to HR managers.

  Analyze the following employee feedback and categorize it into key themes such as work-life balance, compensation, management, etc.
  Determine the sentiment (positive, negative, or neutral) for each theme and provide example sentences from the feedback that support the categorization.
  Based on the identified themes and sentiment, suggest potential improvements that the HR department can implement to address the issues raised in the feedback.

  Employee Feedback:
  {{feedbackText}}

  Provide the output in JSON format.
  `,
});

const analyzeFeedbackFlow = ai.defineFlow(
  {
    name: 'analyzeFeedbackFlow',
    inputSchema: AnalyzeFeedbackInputSchema,
    outputSchema: AnalyzeFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
