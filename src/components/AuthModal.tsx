"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOTPAction, verifyOTPAction } from "@/app/actions/auth";
import { User } from "@supabase/supabase-js";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (user: User) => void;
}

export function AuthModal({ isOpen, onOpenChange, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await sendOTPAction(email);
    setLoading(false);

    if (res.success) {
      setStep("otp");
    } else {
      setError(res.error || "Failed to send OTP. Please try again.");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await verifyOTPAction(email, otp);
    setLoading(false);

    if (res.success && res.user) {
      onOpenChange(false);
      if (onSuccess) onSuccess(res.user);
    } else {
      setError(res.error || "Invalid OTP. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{step === "credentials" ? "Sign In" : "Verify OTP"}</DialogTitle>
          <DialogDescription>
            {step === "credentials" 
              ? "Enter your email to receive a login code."
              : `Enter the code sent to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleSendOTP} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Get Login Code"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="text-center text-2xl tracking-[1em]"
                disabled={loading}
              />
            </div>
            <DialogFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep("credentials")}
                disabled={loading}
                className="w-full"
              >
                Change Email
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
