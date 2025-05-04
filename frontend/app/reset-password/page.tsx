"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, Check, X, Lock, Eye, EyeOff, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EmailService } from '@/utils/api/email-service';
import { ApiError } from '@/utils/api/errors';

// Loading fallback component
const LoadingReset = () => (
  <div className="container max-w-3xl mx-auto px-4 py-12">
    <div className="text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-shadow-md bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
        Reset Password
      </h1>
      <p className="text-muted-foreground text-lg">
        Forge a new key to your covenant, nightfarer.
      </p>
    </div>

    <div className="gothic-card p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
      
      <div className="flex flex-col items-center justify-center py-8 relative z-10">
        <div className="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-indigo-950/30 text-indigo-400">
          <RefreshCw className="w-12 h-12 animate-spin" />
        </div>

        <h2 className="text-2xl font-bold mb-4 text-center w-full text-indigo-400">
          Loading...
        </h2>

        <div className="text-center mb-8 max-w-md mx-auto px-4">
          <p className="text-muted-foreground">
            Preparing reset interface...
          </p>
        </div>
      </div>
    </div>

    <div className="mt-8 text-center">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Shield className="w-4 h-4" />
        <span className="text-sm">Covenant Match Authentication System</span>
      </div>
    </div>
  </div>
);

const ResetPasswordContent = () => {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get token from URL query string
  const tokenQuery = searchParams.get("token");
  
  useEffect(() => {
    if (tokenQuery) {
      setToken(tokenQuery);
    } else {
      setError('No reset token provided. Please check your email link.');
    }
  }, [tokenQuery]);

  const validatePassword = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword() || !token) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await EmailService.resetPassword(password, token);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-shadow-md bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
          Reset Password
        </h1>
        <p className="text-muted-foreground text-lg">
          Forge a new key to your covenant, nightfarer.
        </p>
      </div>

      <div className="gothic-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        
        <div className="flex flex-col items-center justify-center py-8 relative z-10">
          <div className={cn(
            "w-24 h-24 mb-6 flex items-center justify-center rounded-full",
            success ? "bg-emerald-950/30 text-emerald-400" : 
            error && !token ? "bg-red-950/30 text-red-400" : 
            "bg-indigo-950/30 text-indigo-400"
          )}>
            {success ? (
              <Check className="w-12 h-12" />
            ) : error && !token ? (
              <X className="w-12 h-12" />
            ) : (
              <Lock className="w-12 h-12" />
            )}
          </div>

          <h2 className={cn(
            "text-2xl font-bold mb-4 text-center w-full",
            success ? "text-emerald-400" : 
            error && !token ? "text-red-400" : 
            "text-indigo-400"
          )}>
            {success ? "Password Reset Complete!" : error && !token ? "Invalid Reset Link" : "Create New Password"}
          </h2>
          
          {success ? (
            <div className="text-center">
              <div className="text-center mb-8 max-w-md mx-auto px-4">
                <p className="text-muted-foreground">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <div className="animate-fade-in-up w-full flex justify-center">
                <Link href="/login" passHref className="w-full flex justify-center">
                  <Button className="gothic-button w-full sm:w-auto">
                    <span>Proceed to Login</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : error && !token ? (
            <div className="text-center">
              <div className="text-center mb-8 max-w-md mx-auto px-4">
                <p className="text-red-400">
                  {error}
                </p>
              </div>
              <div className="animate-fade-in-up w-full flex justify-center">
                <Link href="/send-email" passHref className="w-full flex justify-center">
                  <Button className="gothic-button w-full sm:w-auto">
                    <span>Request New Reset Link</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-800/50 rounded-md 
                      focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 
                      placeholder-indigo-600/40 text-foreground"
                    required
                  />
                  <button 
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-indigo-500/70" />
                    ) : (
                      <Eye className="w-5 h-5 text-indigo-500/70" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-800/50 rounded-md 
                      focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 
                      placeholder-indigo-600/40 text-foreground"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <div className="rounded-md bg-red-950/30 border border-red-800/40 p-4">
                  <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="mr-2 w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}
              
              <div className="w-full flex justify-center pt-2">
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="gothic-button w-full"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                  <Lock className="ml-2 w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center pt-2">
                <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300 transition">
                  Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span className="text-sm">Covenant Match Authentication System</span>
        </div>
      </div>
    </div>
  );
};

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={<LoadingReset />}>
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPasswordPage;
