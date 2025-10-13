import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocation, Redirect } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Shield, Trophy, Eye, EyeOff } from 'lucide-react';
// import bracketBackground from "../assets/samplebracket.svg";

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle successful Google login
  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
    }
  };

  // Handle local form login
  const handleLocalLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); // Clear previous errors
    const formData = new FormData(event.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (username === 'mahesh' && password === 'Mahesh@007') {
      login({ name: username });
    } else {
      const errorMessage = 'Invalid username or password.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    }
  };

  // If the user is already authenticated, redirect them.
  if (isAuthenticated()) {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect') || '/';
    return <Redirect to={redirectUrl} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden" 
         style={{
           background: 'linear-gradient(to bottom, #86c7f2 0%, #e9f4fb 50%, #FFFFFF 100%)'
         }}>
      
      {/* Subtle cloud-like background overlay */}
      {/* <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/6 w-32 h-16 bg-white/40 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/5 w-24 h-12 bg-white/30 rounded-full blur-lg animate-pulse delay-300"></div>
        <div className="absolute top-1/2 left-1/3 w-40 h-20 bg-white/35 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute bottom-1/4 right-1/4 w-28 h-14 bg-white/25 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/5 w-36 h-18 bg-white/30 rounded-full blur-lg animate-pulse delay-1500"></div>
      </div> */}
      
      {/* Floating sky-themed icons */}
      {/* <div className="absolute top-1/5 left-1/5 text-black animate-pulse">
        <Trophy className="w-10 h-10" />
      </div>
      <div className="absolute top-1/3 right-1/5 text-white/25 animate-pulse delay-500">
        <Shield className="w-8 h-8" />
      </div> */}
      
      <Card className="w-full max-w-md shadow-xl border border-gray-200/30 relative z-10 bg-gradient-to-b from-blue-100 to-white">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-800 via-gray-700 to-black rounded-full flex items-center justify-center mb-2 shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-500">
            Sign in to manage your tournaments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-500 font-medium">Username</Label>
                <Input 
                  id="username" 
                  name="username" 
                  placeholder="Enter your username" 
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-500 font-medium">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" 
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <a 
                    href="#" 
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>
              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In
              </Button>
            </div>
          </form>
          
          <div className="relative">
            <Separator className="bg-gray-300" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-3 text-sm text-gray-500">or continue with</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
             <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  toast({
                    variant: 'destructive',
                    title: 'Google Login Failed',
                    description: 'Please try again.',
                  });
                }}
                useOneTap
              />
          </div>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
