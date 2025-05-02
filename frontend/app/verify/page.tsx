"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Check, X, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserService } from "@/utils/api/user-service";

// Define simple motion component 
const motion = {
  div: ({ children, className, ...props }: React.HTMLProps<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
};

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [verificationState, setVerificationState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setVerificationState("error");
      setMessage("No verification token provided. Please check your email link.");
      return;
    }

    const verifyEmail = async () => {
      try {

        const response = await UserService.verifyEmail(token);
        
        // Success case
        if (response.status === "success") {
          setVerificationState("success");
          setMessage("Your email has been successfully verified! Your covenant awaits.");
        } else {
          throw new Error(response.message || "Unexpected response");
        }
      } catch (error: unknown) {
        setVerificationState("error");
        
        if (error instanceof Error) {
          setMessage(error.message || "Failed to verify your email. The token may be expired or invalid.");
        } else {
          setMessage("Failed to connect to the server. Please try again later.");
        }
        console.error("Verification error:", error);
      }
    };

    // Add a slight delay to allow the loading animation to be seen
    const timer = setTimeout(() => {
      verifyEmail();
    }, 1500);

    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-shadow-md bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
          Email Verification
        </h1>
        <p className="text-muted-foreground text-lg">
          Join the covenant, nightfarer.
        </p>
      </div>

      <div className="gothic-card p-8 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-700 via-indigo-500 to-purple-700 opacity-70"></div>
        
        <div className="flex flex-col items-center justify-center py-8 relative z-10">
          <motion.div
            className={cn(
              "w-24 h-24 mb-6 flex items-center justify-center rounded-full",
              verificationState === "success" ? "bg-emerald-950/30 text-emerald-400" : 
              verificationState === "error" ? "bg-red-950/30 text-red-400" : 
              "bg-indigo-950/30 text-indigo-400"
            )}
          >
            {verificationState === "loading" ? (
              <RefreshCw className="w-12 h-12 animate-spin" />
            ) : verificationState === "success" ? (
              <Check className="w-12 h-12" />
            ) : (
              <X className="w-12 h-12" />
            )}
          </motion.div>

          <h2 className={cn(
            "text-2xl font-bold mb-4 text-center w-full",
            verificationState === "success" ? "text-emerald-400" : 
            verificationState === "error" ? "text-red-400" : 
            "text-indigo-400"
          )}>
            {verificationState === "loading" ? "Verifying Your Covenant Seal..." : 
             verificationState === "success" ? "Verification Complete!" : 
             "Verification Failed!"}
          </h2>

          <div className="text-center mb-8 max-w-md mx-auto px-4">
            {verificationState === "loading" ? (
              <p className="text-muted-foreground">
                Confirming your identity with the greater will...
              </p>
            ) : (
              <p className={verificationState === "error" ? "text-red-200" : "text-muted-foreground"}>
                {message}
              </p>
            )}
          </div>

          {verificationState !== "loading" && (
            <div className="animate-fade-in-up w-full flex justify-center">
              {verificationState === "success" ? (
                <Link href="/login" passHref className="w-full flex justify-center">
                  <Button className="gothic-button w-full sm:w-auto">
                    <span>Proceed to Login</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                  <Button variant="outline" onClick={() => router.refresh()}>
                    <RefreshCw className="mr-2 w-4 h-4" />
                    <span>Try Again</span>
                  </Button>
                  <Link href="/login" passHref>
                    <Button variant="secondary">
                      <span>Return to Login</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span className="text-sm">Covenant Match Authentication System</span>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
