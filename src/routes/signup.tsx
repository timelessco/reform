import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { revalidateLogic, useAppForm } from "@/components/ui/tanstack-form";
import { auth } from "@/lib/auth-client";
import { guestMiddleware } from "@/middleware/auth";
import { Logo } from "@/components/ui/logo";

export const Route = createFileRoute("/signup")({
  server: {
    middleware: [guestMiddleware],
  },
  component: SignUpPage,
});

const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, dots, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

function SignUpPage() {
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [email, setEmail] = React.useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signUpMutation = useMutation(
    auth.signUp.email.mutationOptions({
      onSuccess: async (_, variables) => {
        setEmail(variables.email);
        toast.success("Account created! Please verify your email.");
        setStep("otp");
      },
      onError: (error) => {
        toast.error(error.message || "Sign up failed");
      },
    }),
  );

  const verifyEmailMutation = useMutation(
    auth.emailOtp.verifyEmail.mutationOptions({
      onSuccess: async () => {
        toast.success("Email verified successfully!");
        await queryClient.invalidateQueries({
          queryKey: auth.getSession.queryKey(),
        });
        // Set flag for dashboard to handle sync (org is created there)
        sessionStorage.setItem("shouldSyncAfterLogin", "true");
        navigate({ to: "/dashboard" });
      },
      onError: (error) => {
        toast.error(error.message || "Verification failed");
      },
    }),
  );

  const sendOtpMutation = useMutation(
    auth.emailOtp.sendVerificationOtp.mutationOptions({
      onSuccess: () => {
        toast.success("Code resent to your email");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send code");
      },
    }),
  );

  const signUpForm = useAppForm({
    defaultValues: {
      username: "",
      email: "",
      name: "",
      password: "",
    } as z.input<typeof signUpSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signUpSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      signUpMutation.mutate({
        email: value.email,
        password: value.password,
        name: value.name,
        username: value.username,
      });
    },
  });

  const otpForm = useAppForm({
    defaultValues: {
      otp: "",
    } as z.input<typeof otpSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: otpSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      verifyEmailMutation.mutate({
        email,
        otp: value.otp,
      });
    },
  });

  const socialSignInMutation = useMutation(
    auth.signIn.social.mutationOptions({
      onSuccess: () => {
        sessionStorage.setItem("shouldSyncAfterSocialLogin", "true");
      },
      onError: (error) => {
        sessionStorage.removeItem("shouldSyncAfterSocialLogin");
        toast.error(error.message || "Failed to sign in with Google");
      },
    }),
  );

  const handleGoogleSignIn = async () => {
    socialSignInMutation.mutate({
      provider: "google",
      callbackURL: window.location.origin,
    });
  };

  const isPending =
    signUpMutation.isPending ||
    verifyEmailMutation.isPending ||
    sendOtpMutation.isPending ||
    socialSignInMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo />
        </div>


        {/* OTP verification step */}
        {step === "otp" ? (
          <div className="space-y-6">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("form")}
              className="text-muted-foreground hover:text-foreground"
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
              Back
            </Button>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Verify your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <otpForm.AppForm key="otp-signup">
              <otpForm.Form className="space-y-6">
                <otpForm.AppField name="otp">
                  {(field) => (
                    <field.FieldSet>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={(field.state.value as string) ?? ""}
                          onChange={field.handleChange}
                          onComplete={() => {
                            verifyEmailMutation.mutate({
                              email,
                              otp: field.state.value as string,
                            });
                          }}
                          disabled={isPending}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={1} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={2} className="w-11 h-12 text-lg" />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={4} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={5} className="w-11 h-12 text-lg" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <field.FieldError className="text-center mt-2" />
                    </field.FieldSet>
                  )}
                </otpForm.AppField>

                <Button type="submit" className="w-full h-11" disabled={isPending}>
                  {verifyEmailMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-label="Loading" />
                  )}
                  Verify
                </Button>
              </otpForm.Form>
            </otpForm.AppForm>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <Button
                variant="link"
                onClick={() => sendOtpMutation.mutate({ email, type: "email-verification" })}
                disabled={isPending}
                className="p-0 h-auto font-medium"
              >
                Resend
              </Button>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google Sign Up */}
            <Button
              variant="outline"
              className="w-full h-11 font-normal"
              onClick={handleGoogleSignIn}
              disabled={isPending}
            >
              {socialSignInMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-label="Loading" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <title>Google</title>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Sign Up Form */}
            <signUpForm.AppForm key="main-signup">
              <signUpForm.Form className="space-y-4">
                <signUpForm.AppField name="name">
                  {(field) => (
                    <field.FieldSet>
                      <field.Field>
                        <Input
                          placeholder="Name"
                          className="h-11"
                          value={(field.state.value as string) ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </field.Field>
                      <field.FieldError />
                    </field.FieldSet>
                  )}
                </signUpForm.AppField>

                <signUpForm.AppField name="username">
                  {(field) => (
                    <field.FieldSet>
                      <field.Field>
                        <Input
                          placeholder="Username"
                          className="h-11"
                          value={(field.state.value as string) ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </field.Field>
                      <field.FieldError />
                    </field.FieldSet>
                  )}
                </signUpForm.AppField>

                <signUpForm.AppField name="email">
                  {(field) => (
                    <field.FieldSet>
                      <field.Field>
                        <Input
                          type="email"
                          placeholder="Email"
                          className="h-11"
                          value={(field.state.value as string) ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </field.Field>
                      <field.FieldError />
                    </field.FieldSet>
                  )}
                </signUpForm.AppField>

                <signUpForm.AppField name="password">
                  {(field) => (
                    <field.FieldSet>
                      <field.Field>
                        <Input
                          type="password"
                          placeholder="Password"
                          className="h-11"
                          value={(field.state.value as string) ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </field.Field>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        8+ characters with uppercase, lowercase, and number
                      </p>
                      <field.FieldError />
                    </field.FieldSet>
                  )}
                </signUpForm.AppField>

                <Button type="submit" className="w-full h-11" disabled={isPending}>
                  {signUpMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-label="Loading" />
                  )}
                  Create account
                </Button>
              </signUpForm.Form>
            </signUpForm.AppForm>

            {/* Switch to sign in */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
