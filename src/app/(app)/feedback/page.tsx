
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFeedbackAnalysis, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle, Loader2, Lightbulb, Tag, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Analyze Feedback
    </Button>
  );
}

export default function FeedbackAnalysisPage() {
  const initialState: FormState = { message: null };
  const [state, formAction] = useActionState(submitFeedbackAnalysis, initialState);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-semibold">Employee Feedback Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Leverage AI to categorize employee feedback and uncover actionable insights.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Submit Feedback for Analysis</CardTitle>
          <CardDescription>
            Paste raw employee feedback text (e.g., from surveys, exit interviews) into the text area below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="feedbackText">Feedback Text</Label>
              <Textarea
                id="feedbackText"
                name="feedbackText"
                placeholder="Enter employee feedback here..."
                rows={10}
                className="min-h-[150px] focus:ring-primary focus:border-primary"
                aria-describedby="feedbackText-error"
              />
              {state?.errors?.feedbackText && (
                <p id="feedbackText-error" className="text-sm text-destructive">
                  {state.errors.feedbackText.join(", ")}
                </p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      {state?.message && !state.analysisResult && (
         <Alert variant={state.errors || state.message.startsWith("Analysis failed:") ? "destructive" : "default"} className="mt-6">
          {state.errors || state.message.startsWith("Analysis failed:") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertTitle>{state.errors || state.message.startsWith("Analysis failed:") ? "Error" : "Status"}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.analysisResult && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Analysis Results</CardTitle>
            <CardDescription>Themes and suggestions identified from the feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center"><Tag className="mr-2 h-5 w-5 text-primary" />Key Themes</h3>
              {state.analysisResult.themes.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {state.analysisResult.themes.map((item, index) => (
                    <AccordionItem value={`item-${index}`} key={index} className="border-b border-border">
                      <AccordionTrigger className="text-base hover:no-underline">
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.sentiment.toLowerCase() === 'positive' ? 'bg-green-100 text-green-700' :
                            item.sentiment.toLowerCase() === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.sentiment}
                          </span>
                          {item.theme}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-2 text-muted-foreground">
                        <p className="font-medium text-sm text-foreground">Examples:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {item.examples.map((example, exIndex) => (
                            <li key={exIndex} className="italic">"{example}"</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground">No specific themes identified.</p>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" />Suggested Improvements</h3>
              {state.analysisResult.suggestions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {state.analysisResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm">{suggestion}</li>
                  ))}
                </ul>
              ) : (
                 <p className="text-muted-foreground">No specific suggestions provided based on this feedback.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
