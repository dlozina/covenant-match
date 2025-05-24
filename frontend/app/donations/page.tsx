"use client";

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Heart, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
console.log("Stripe publishable key:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

type Currency = 'usd' | 'eur';

export default function DonationForm() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const currencySymbols = {
    usd: '$',
    eur: '€'
  };

  const handleDonate = async () => {
    setLoading(true);
    
    const response = await fetch('/api/v1/payment/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: parseInt(amount) * 100, // Convert to cents
        currency: currency,
        display_name: displayName || undefined // Only send if not empty
      })
    });

    const { session_id } = await response.json();
    const stripe = await stripePromise;

    const { error } = await stripe!.redirectToCheckout({
      sessionId: session_id
    });

    if (error) console.error(error);
    setLoading(false);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300 mb-4">
          Support Covenant Match
        </h1>
        <div className="text-left space-y-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <h2 className="text-base sm:text-lg font-semibold text-purple-400 mb-2">My Commitment to You</h2>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  Covenant Match will always be completely free to use - We are gamers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  No ads - I believe in a clean, distraction-free experience
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  No third-party cookies or data collection - not a fan of that
                </li>
              </ul>
            </div>

            <p className="text-muted-foreground text-sm sm:text-base">
              Help me continue building the matchmaking platform for the Covenant community.
              Your support is invaluable in helping me maintain and improve the platform.
            </p>

            <div>
              <h3 className="font-medium mb-2 text-sm sm:text-base">Donations will be used to:</h3>
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

            <p className="text-muted-foreground text-sm sm:text-base">
              All donations directly contribute to making Covenant Match sustainable and better for everyone.
              I&apos;m focused on one thing: Making sure that everyone has a good team to play Elden Ring - Nightreign.
            </p>
          </div>
        </div>
      </div>

      {/* Donation Form */}
      <div className="space-y-6 p-4 sm:p-6 rounded-lg border border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">How would you like to be displayed?</label>
            <Input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full h-10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is how you&apos;ll appear in our supporters list. Leave blank to use your email username.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <Select 
              value={currency}
              onValueChange={(value: Currency) => setCurrency(value)}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">🇺🇸 US Dollar (USD)</SelectItem>
                <SelectItem value="eur">🇪🇺 Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Amount ({currencySymbols[currency]})
            </label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount in ${currency.toUpperCase()}`}
              min="1"
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-purple-500/50 text-sm sm:text-base"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20].map(preset => (
              <Button
                key={preset}
                variant="outline"
                onClick={() => setAmount(preset.toString())}
                className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50 text-sm sm:text-base"
              >
                {currencySymbols[currency]}{preset}
              </Button>
            ))}
          </div>

          <Button 
            onClick={handleDonate} 
            disabled={loading || !amount}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm sm:text-base"
          >
            <Heart className="h-4 w-4 mr-2" />
            {loading ? 'Processing...' : `Donate ${currencySymbols[currency]}${amount}`}
          </Button>
        </div>
      </div>

      {/* Full-width Donors List */}
      <div className="mt-12 p-4 sm:p-6 rounded-lg border border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl sm:text-2xl font-semibold">Our Generous Supporters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Example donor cards - replace with actual data from your backend */}
          <div className="p-3 sm:p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center text-white text-sm sm:text-base font-medium">
                JD
              </div>
              <div>
                <p className="font-medium text-sm sm:text-base">John Doe</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Supporter</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center text-white text-sm sm:text-base font-medium">
                JS
              </div>
              <div>
                <p className="font-medium text-sm sm:text-base">Jane Smith</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Supporter</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center text-white text-sm sm:text-base font-medium">
                RJ
              </div>
              <div>
                <p className="font-medium text-sm sm:text-base">Robert Johnson</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Supporter</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
