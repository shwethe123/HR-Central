
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
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  useEffect(() => {
    // auth-context now handles redirecting if user is logged in and on /login page
    // So this useEffect primarily handles the case where auth is not loading AND user exists
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      // The AuthContext and its useEffect will handle redirection upon successful login
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      // Optionally, show an error message to the user (e.g., via toast)
      setIsLoggingIn(false); // Reset logging in state on error
    }
    // setIsLoggingIn(false) is also handled by onAuthStateChanged implicitly if login is successful
  };

  // Show loading spinner if auth state is still loading or if user is already logged in (and about to be redirected)
  if (authLoading || (user && !authLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // If not loading and no user, show login page
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
          disabled={isLoggingIn || authLoading}
          className="w-full text-base py-6 shadow-md hover:shadow-lg transition-shadow duration-300"
          variant="default"
        >
          {isLoggingIn ? ( // Show loader if isLoggingIn is true
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
