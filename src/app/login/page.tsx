
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const { user, loginWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter(); // Keep for potential future use, though AuthProvider handles redirects
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Tracks button click login attempt

  // AuthProvider's useEffect now handles redirecting if user is logged in and on /login page
  // or if user is not logged in and on a protected page.
  // This useEffect can be simplified or removed if not needed for other logic.
  // useEffect(() => {
  //   if (!authLoading && user) {
  //     // This case should be handled by AuthProvider now
  //     // router.push('/dashboard');
  //   }
  // }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true); // Indicate login attempt started
    try {
      await loginWithGoogle();
      // The AuthContext and its useEffect will handle redirection upon successful login
      // No need to setIsLoggingIn(false) here, as onAuthStateChanged will update authLoading
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setIsLoggingIn(false); // Reset logging in state on error to allow re-attempt
    }
  };

  // Show loading spinner if auth state is still loading or if login button was clicked
  // or if user is already logged in (and AuthProvider is about to redirect)
  if (authLoading || (user && !authLoading)) { 
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // If not authLoading and no user, show login page
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <AppLogo className="mb-4 h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to HR Central</h1>
          <p className="mt-2 text-muted-foreground">Sign in to access your dashboard.</p>
        </div>
        
        <Button 
          onClick={handleGoogleSignIn} 
          disabled={isLoggingIn} // Disable button while login attempt is in progress
          className="w-full text-base py-6 shadow-md hover:shadow-lg transition-shadow duration-300"
          variant="default"
        >
          {isLoggingIn ? ( 
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Image src="/google-logo.svg" alt="Google" width={20} height={20} className="mr-3" data-ai-hint="logo social"/>
          )}
          Sign in with Google
        </Button>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
       <footer className="absolute bottom-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} HR Central. All rights reserved.
      </footer>
    </div>
  );
}
