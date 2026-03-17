import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2Icon } from "@/components/ui/icons";
import * as React from "react";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { auth, useSession } from "@/lib/auth-client";
import { setSyncAfterLoginFlag } from "@/lib/local-draft";

const searchSchema = z.object({
  email: z.string().email().optional(),
  mode: z.enum(["signin", "verify"]).optional(),
});

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/verify-email" });
  const { data: session } = useSession();

  // Email from search params (new flow) or session (existing flow)
  const email = search.email || session?.user?.email || "";
  const isSignInMode = search.mode === "signin";

  const [otp, setOtp] = React.useState("");
  const otpInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus OTP input on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Sign in with OTP (for new sign-in flow)
  const signInOtpMutation = useMutation(
    auth.signIn.emailOtp.mutationOptions({
      onSuccess: () => {
        toast.success("Signed in successfully!");
        setSyncAfterLoginFlag();
        queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
        navigate({ to: "/dashboard", replace: true });
      },
      onError: (error) => {
        toast.error(error.message || "Verification failed");
        setOtp("");
      },
    }),
  );

  // Verify email (for existing users with unverified email)
  const verifyEmailMutation = useMutation(
    auth.emailOtp.verifyEmail.mutationOptions({
      onSuccess: () => {
        toast.success("Email verified successfully!");
        queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
        navigate({ to: "/dashboard", replace: true });
      },
      onError: (error) => {
        toast.error(error.message || "Verification failed");
        setOtp("");
      },
    }),
  );

  const sendOtpMutation = useMutation(
    auth.emailOtp.sendVerificationOtp.mutationOptions({
      onSuccess: () => {
        toast.success("Verification code resent");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to resend code");
      },
    }),
  );

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        navigate({ to: "/" });
      },
    }),
  );
  const handleVerify = () => {
    if (otp.length !== 6) return;

    if (isSignInMode) {
      signInOtpMutation.mutate({ email, otp });
    } else {
      verifyEmailMutation.mutate({ email, otp });
    }
  };
  const handleResend = () => {
    sendOtpMutation.mutate({
      email,
      type: isSignInMode ? "sign-in" : "email-verification",
    });
  };
  const handleBack = () => {
    if (isSignInMode) {
      navigate({ to: "/login" });
    } else {
      signOutMutation.mutate({});
    }
  };

  const isPending =
    signInOtpMutation.isPending ||
    verifyEmailMutation.isPending ||
    sendOtpMutation.isPending ||
    signOutMutation.isPending;

  if (!email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No email address found</p>
          <Button variant="link" onClick={() => navigate({ to: "/login" })} className="p-0 h-auto">
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden">
      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex justify-center mb-16">
          <span className="text-4xl font-serif italic font-bold tracking-tighter text-foreground">
            f.
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isPending}
            className="self-start -ml-1 mb-8 text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-label="Back icon"
            >
              <title>Back icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isSignInMode ? "Back" : "Sign out"}
          </Button>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground text-[15px] mb-2">We sent a code to</p>
          <p className="text-foreground text-[15px] mb-10">{email}</p>

          {/* OTP Input */}
          <div className="mb-8">
            <InputOTP
              ref={otpInputRef}
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={(value) => {
                if (isSignInMode) {
                  signInOtpMutation.mutate({ email, otp: value });
                } else {
                  verifyEmailMutation.mutate({ email, otp: value });
                }
              }}
              disabled={isPending}
              className="gap-2"
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="w-12 h-14 text-xl rounded-xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Verify button */}
          <Button
            type="button"
            onClick={handleVerify}
            disabled={isPending || otp.length !== 6}
            className="w-full h-12 rounded-xl text-[15px]"
          >
            {signInOtpMutation.isPending || verifyEmailMutation.isPending ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" aria-label="Loading" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          {/* Resend */}
          <div className="mt-8 text-[13px] text-muted-foreground">
            Didn't receive the code?{" "}
            <Button
              variant="link"
              onClick={handleResend}
              disabled={isPending}
              className="p-0 h-auto text-foreground/70 hover:text-foreground"
            >
              {sendOtpMutation.isPending ? "Sending..." : "Resend"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
});
