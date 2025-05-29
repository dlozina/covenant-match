"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

interface PaymentDetails {
  status: string;
  payment_status: string;
  amount_total: number;
  currency: string;
  customer_email?: string;
}

function DonationSuccessContent() {
  const searchParams = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No payment session found');
      setLoading(false);
      return;
    }

    verifyPayment(sessionId);
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/v1/payment/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      setPaymentDetails(data);
    } catch (error) {
      console.error('Payment verification failed:', error);
      setError('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verifying your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="space-y-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full bg-red-500/20 animate-pulse" />
            </div>
            <div className="text-6xl mb-4 relative z-10">❌</div>
          </div>
          <h1 className="text-3xl font-bold text-red-800">Payment Error</h1>
          <p className="text-muted-foreground text-lg">{error}</p>
          <Button
            variant="outline"
            className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50"
            asChild
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 animate-pulse" />
          </div>
          <Heart className="h-16 w-16 mx-auto text-purple-400 relative z-10" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
            Thank You for Your Support!
          </h1>
          {paymentDetails && (
            <div className="space-y-2 text-muted-foreground">
              <p className="text-lg font-semibold">
                {(paymentDetails.amount_total / 100).toFixed(2)} {paymentDetails.currency?.toUpperCase()}
              </p>
              <p>Payment Status: <span className="text-green-600 font-medium">Completed</span></p>
              {paymentDetails.customer_email && (
                <p className="text-sm">Receipt sent to: {paymentDetails.customer_email}</p>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-lg">
            Your generous contribution helps us continue building and improving Covenant Match for the entire community.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-lg border border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">What Your Support Enables</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li className="flex items-start gap-2">
                    <span> <span className="text-purple-400 mt-1">•</span> Cover server costs and ensure reliable performance</span>
                </li>
                <li className="flex items-start gap-2">
                    <span> <span className="text-purple-400 mt-1">•</span> Maintain and improve the platform&apos;s features</span>
                </li>
                <li className="flex items-start gap-2">
                    <span> <span className="text-purple-400 mt-1">•</span> Fund new features and updates to enhance your matchmaking experience</span>
                </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50"
              asChild
            >
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
              asChild
            >
              <Link href="/donations" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Support Again
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DonationSuccess() {
  return (
    <Suspense fallback={
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <DonationSuccessContent />
    </Suspense>
  );
}
