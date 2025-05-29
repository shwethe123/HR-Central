
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
import { Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthError } from 'firebase/auth';
import Image from 'next/image';

export default function LoginPage() {
  const { user, loginWithEmailPassword, signUpWithEmailPassword, loginWithGoogle, loading: authLoading } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const getFriendlyErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/user-not-found':
        return 'No user found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email address is already in use.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/requires-recent-login':
        return 'This operation is sensitive and requires recent authentication. Log in again before retrying this request.';
      case 'auth/operation-not-allowed':
         return 'This sign-in method (Email/Password or Google) is not enabled for this Firebase project. Please contact support or check Firebase console settings.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in process was cancelled (popup closed).';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Firebase operations. Please check "Authorized domains" in Firebase console.';
      case 'auth/api-key-not-valid':
        return 'The API Key for Firebase is invalid. Please check your application configuration.';
      default:
        console.error("Firebase Auth Error:", error.code, error.message);
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoginLoading(true);
    const result = await loginWithEmailPassword(loginEmail, loginPassword);
    if (!result.success && result.error) {
      setLoginError(getFriendlyErrorMessage(result.error));
    }
    setIsLoginLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignUpError(null);
    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError("Passwords do not match.");
      return;
    }
    setIsSignUpLoading(true);
    const result = await signUpWithEmailPassword(signUpEmail, signUpPassword);
    if (!result.success && result.error) {
      setSignUpError(getFriendlyErrorMessage(result.error));
    }
    setIsSignUpLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null); 
    setSignUpError(null);
    setIsGoogleLoading(true);
    const result = await loginWithGoogle();
    if (!result.success && result.error) {
      setLoginError(getFriendlyErrorMessage(result.error)); 
    }
    setIsGoogleLoading(false);
  };

  if (authLoading || (user && !authLoading)) { // Keep user check for initial redirect if already logged in
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AppLogo className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to HR Central</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div className="relative">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1 pr-10"
                  />
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showLoginPassword ? 'Hide password' : 'Show password'}</span>
                  </Button>
                </div>
                {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                <Button type="submit" className="w-full" disabled={isLoginLoading || authLoading}>
                  {isLoginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Login
                </Button>
              </form>
              <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="mx-2 text-xs uppercase text-muted-foreground">Or continue with</span>
                <div className="flex-grow border-t border-muted"></div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || authLoading}>
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Image src="/google-logo.svg" alt="Google logo" width={16} height={16} className="mr-2" />
                )}
                Google
              </Button>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                 <div className="relative">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="mt-1 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    tabIndex={-1}
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showSignUpPassword ? 'Hide password' : 'Show password'}</span>
                  </Button>
                </div>
                <div className="relative">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type={showSignUpConfirmPassword ? "text" : "password"}
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Retype your password"
                    required
                    className="mt-1 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showSignUpConfirmPassword ? 'Hide password' : 'Show password'}</span>
                  </Button>
                </div>
                {signUpError && <p className="text-sm text-destructive">{signUpError}</p>}
                <Button type="submit" className="w-full" disabled={isSignUpLoading || authLoading}>
                  {isSignUpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex-col items-center justify-center text-xs text-muted-foreground pt-6">
            <p>By signing in or creating an account, you agree to our</p>
            <p><a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>.</p>
        </CardFooter>
      </Card>
      <footer className="absolute bottom-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} HR Central. All rights reserved.
      </footer>
    </div>
  );
}
