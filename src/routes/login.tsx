import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";
import { guestMiddleware } from "@/middleware/auth";
import { Logo } from "@/components/ui/logo";

export const Route = createFileRoute("/login")({
  server: {
    middleware: [guestMiddleware],
  },
  component: LoginPage,
});

const signInEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signInUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signInOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const otpVerifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type SignInMethod = "email" | "username" | "otp";

function LoginPage() {
  const [signInMethod, setSignInMethod] = React.useState<SignInMethod>("email");
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [email, setEmail] = React.useState("");
  const router = useRouter();

  const signInMutation = useMutation(
    auth.signIn.email.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        // Set flag for dashboard to handle sync (org is available there)
        sessionStorage.setItem("shouldSyncAfterLogin", "true");
        router.navigate({ to: "/dashboard", replace: true });
      },
      onError: (error) => {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({ to: "/verify-email" });
        }
        toast.error(error.message || "Sign in failed");
      },
    }),
  );

  const signInUsernameMutation = useMutation(
    auth.signIn.username.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        // Set flag for dashboard to handle sync (org is available there)
        sessionStorage.setItem("shouldSyncAfterLogin", "true");
        router.navigate({ to: "/dashboard", replace: true });
      },
      onError: (error) => {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({ to: "/verify-email" });
        }
        toast.error(error.message || "Sign in failed");
      },
    }),
  );

  const sendOtpMutation = useMutation(
    auth.emailOtp.sendVerificationOtp.mutationOptions({
      onSuccess: (_, variables) => {
        setEmail(variables.email);
        toast.success("Code sent to your email");
        setStep("otp");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send code");
      },
    }),
  );

  const verifyOtpMutation = useMutation(
    auth.signIn.emailOtp.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        // Set flag for dashboard to handle sync (org is available there)
        sessionStorage.setItem("shouldSyncAfterLogin", "true");
        router.navigate({ to: "/dashboard", replace: true });
      },
      onError: (error) => {
        toast.error(error.message || "Verification failed");
      },
    }),
  );

  const socialSignInMutation = useMutation(
    auth.signIn.social.mutationOptions({
      onSuccess: () => {
        sessionStorage.setItem("shouldSyncAfterSocialLogin", "true");
      },
      onError: (error) => {
        sessionStorage.removeItem("shouldSyncAfterSocialLogin");
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({ to: "/verify-email" });
        }
        toast.error(error.message || "Failed to sign in with Google");
      },
    }),
  );

  const emailForm = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    } as z.input<typeof signInEmailSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInEmailSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      signInMutation.mutate({
        email: value.email,
        password: value.password,
      });
    },
  });

  const usernameForm = useAppForm({
    defaultValues: {
      username: "",
      password: "",
    } as z.input<typeof signInUsernameSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInUsernameSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      signInUsernameMutation.mutate({
        username: value.username,
        password: value.password,
      });
    },
  });

  const otpRequestForm = useAppForm({
    defaultValues: {
      email: "",
    } as z.input<typeof signInOtpSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signInOtpSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      sendOtpMutation.mutate({
        email: value.email,
        type: "sign-in",
      });
    },
  });

  const otpVerifyForm = useAppForm({
    defaultValues: {
      otp: "",
    } as z.input<typeof otpVerifySchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: otpVerifySchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: async ({ value }) => {
      verifyOtpMutation.mutate({
        email,
        otp: value.otp,
      });
    },
  });

  const isPending =
    signInMutation.isPending ||
    signInUsernameMutation.isPending ||
    sendOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    socialSignInMutation.isPending;

  const handleGoogleSignIn = async () => {
    socialSignInMutation.mutate({ provider: "google", callbackURL: window.location.origin });
  };

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
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <otpVerifyForm.AppForm key="otp-verify">
              <otpVerifyForm.Form className="space-y-6">
                <otpVerifyForm.AppField name="otp">
                  {(field) => (
                    <field.FieldSet>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={(field.state.value as string) ?? ""}
                          onChange={field.handleChange}
                          onComplete={() => {
                            verifyOtpMutation.mutate({
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
                </otpVerifyForm.AppField>

                <Button type="submit" className="w-full h-11" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </otpVerifyForm.Form>
            </otpVerifyForm.AppForm>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <Button
                variant="link"
                onClick={() => sendOtpMutation.mutate({ email, type: "sign-in" })}
                disabled={isPending}
                className="p-0 h-auto font-medium"
              >
                Resend
              </Button>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google Sign In */}
            <Button
              variant="outline"
              className="w-full h-11 font-normal"
              onClick={handleGoogleSignIn}
              disabled={isPending}
            >
              {socialSignInMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

            {/* Method tabs */}
            <div className="flex justify-center gap-1 text-sm">
              {(["email", "username", "otp"] as const).map((method) => (
                <Button
                  key={method}
                  variant="tab"
                  size="sm"
                  onClick={() => setSignInMethod(method)}
                  data-active={signInMethod === method}
                  className={cn(
                    "rounded-full capitalize",
                    signInMethod === method && "bg-foreground text-background font-medium hover:bg-foreground hover:text-background",
                  )}
                >
                  {method === "otp" ? "Passwordless" : method}
                </Button>
              ))}
            </div>

            {/* Email + Password Form */}
            {signInMethod === "email" && (
              <emailForm.AppForm key="email-signin">
                <emailForm.Form className="space-y-4">
                  <emailForm.AppField name="email">
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
                  </emailForm.AppField>

                  <emailForm.AppField name="password">
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
                        <field.FieldError />
                      </field.FieldSet>
                    )}
                  </emailForm.AppField>

                  <Button type="submit" className="w-full h-11" disabled={isPending}>
                    {signInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </emailForm.Form>
              </emailForm.AppForm>
            )}

            {/* Username + Password Form */}
            {signInMethod === "username" && (
              <usernameForm.AppForm key="username-signin">
                <usernameForm.Form className="space-y-4">
                  <usernameForm.AppField name="username">
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
                  </usernameForm.AppField>

                  <usernameForm.AppField name="password">
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
                        <field.FieldError />
                      </field.FieldSet>
                    )}
                  </usernameForm.AppField>

                  <Button type="submit" className="w-full h-11" disabled={isPending}>
                    {signInUsernameMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Sign in
                  </Button>
                </usernameForm.Form>
              </usernameForm.AppForm>
            )}

            {/* Passwordless OTP Form */}
            {signInMethod === "otp" && (
              <otpRequestForm.AppForm key="otp-request">
                <otpRequestForm.Form className="space-y-4">
                  <otpRequestForm.AppField name="email">
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
                  </otpRequestForm.AppField>

                  <Button type="submit" className="w-full h-11" disabled={isPending}>
                    {sendOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send code
                  </Button>
                </otpRequestForm.Form>
              </otpRequestForm.AppForm>
            )}

            {/* Switch to sign up */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-foreground hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
