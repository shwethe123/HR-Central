
import { redirect } from 'next/navigation';

// This page now primarily serves to redirect.
// Auth checks and further redirection (to /login or /dashboard)
// are handled by /app/(app)/layout.tsx and /contexts/auth-context.tsx.
export default function HomePage() {
  redirect('/dashboard'); // Or redirect to /login if you prefer a different initial flow
  return null; 
}
