'use client';

import { useState } from 'react';
import { Shield, Send, ArrowRight, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { emailService } from '@/utils/api/email-service';
import { ApiError } from '@/utils/api/errors';
import { Input } from '@/components/ui/input';

export default function SendResetEmailPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await emailService.sendResetPasswordEmail(email);
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

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
          Reset Password
        </h1>
        <p className="text-muted-foreground text-lg">
          Reclaim your covenant, nightfarer.
        </p>
      </div>

      <div className="gothic-card-no-hover p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        
        <div className="flex flex-col items-center justify-center py-8 relative z-10">
          <div className={cn(
            "w-24 h-24 mb-6 flex items-center justify-center rounded-full",
            success ? "bg-emerald-950/30 text-emerald-400" : 
            error ? "bg-red-950/30 text-red-400" : 
            "bg-indigo-950/30 text-indigo-400"
          )}>
            {success ? (
              <Send className="w-12 h-12" />
            ) : error ? (
              <AlertCircle className="w-12 h-12" />
            ) : (
              <Mail className="w-12 h-12" />
            )}
          </div>

          <h2 className={cn(
            "text-2xl font-bold mb-4 text-center w-full",
            success ? "text-emerald-400" : 
            error ? "text-red-400" : 
            "text-indigo-400"
          )}>
            {success ? "Reset Link Sent!" : "Reset Your Password"}
          </h2>
          
          {success ? (
            <div className="text-center">
              <div className="text-center mb-8 max-w-md mx-auto px-4">
                <p className="text-muted-foreground">
                  If an account exists with this email, you&apos;ll receive instructions to reset your password.
                </p>
              </div>
              <div className="animate-fade-in-up w-full flex justify-center">
                <Link href="/login" passHref className="w-full flex justify-center">
                  <Button className="gothic-button w-full sm:w-auto">
                    <span>Return to Login</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-10 pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the email address associated with your account.
                </p>
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
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                  <Send className="ml-2 w-4 h-4" />
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
}
