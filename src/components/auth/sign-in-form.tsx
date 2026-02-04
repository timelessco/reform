import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
import { syncLocalDataToCloud } from "@/lib/sync";

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

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

type SignInMethod = "email" | "username" | "otp";

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const [signInMethod, setSignInMethod] = React.useState<SignInMethod>("email");
  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [email, setEmail] = React.useState("");
  const router = useRouter();
  const signInMutation = useMutation(
    auth.signIn.email.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        try {
          await syncLocalDataToCloud();
          toast.success("Local data synced successfully!");
        } catch (error) {
          console.error("Failed to sync local data:", error);
          toast.error("Signed in but failed to sync local data");
        }
        // Navigate to dashboard after successful sync
        router.navigate({ to: "/dashboard", replace: true });
        onSuccess?.();
      },
      onError: (error) => {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({
            to: "/verify-email",
          });
        }
        toast.error(error.message || "Sign in failed");
      },
    }),
  );
  const signInUsernameMutation = useMutation(
    auth.signIn.username.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        try {
          await syncLocalDataToCloud();
          toast.success("Local data synced successfully!");
        } catch (error) {
          console.error("Failed to sync local data:", error);
          toast.error("Signed in but failed to sync local data");
        }
        // Navigate to dashboard after successful sync
        router.navigate({ to: "/dashboard", replace: true });
        onSuccess?.();
      },
      onError: (error) => {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({
            to: "/verify-email",
          });
        }
        toast.error(error.message || "Sign in failed");
      },
    }),
  );

  const sendOtpMutation = useMutation(
    auth.emailOtp.sendVerificationOtp.mutationOptions({
      onSuccess: (_, variables) => {
        setEmail(variables.email);
        toast.success("OTP sent to your email");
        setStep("otp");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send OTP");
      },
    }),
  );

  const verifyOtpMutation = useMutation(
    auth.signIn.emailOtp.mutationOptions({
      onSuccess: async () => {
        toast.success("Signed in successfully!");
        try {
          await syncLocalDataToCloud();
          toast.success("Local data synced successfully!");
        } catch (error) {
          console.error("Failed to sync local data:", error);
          toast.error("Signed in but failed to sync local data");
        }
        // Navigate to dashboard after successful sync
        router.navigate({ to: "/dashboard", replace: true });
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Verification failed");
      },
    }),
  );

  const socialSignInMutation = useMutation(
    auth.signIn.social.mutationOptions({
      onSuccess: () => {
        // Set flag to sync on dashboard after redirect
        sessionStorage.setItem("shouldSyncAfterSocialLogin", "true");
        toast.success("Signed in successfully!");
      },
      onError: (error) => {
        sessionStorage.removeItem("shouldSyncAfterSocialLogin");
        if (error.code === "EMAIL_NOT_VERIFIED") {
          router.navigate({
            to: "/verify-email",
          });
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
    validators: {
      onDynamic: signInUsernameSchema,
      onDynamicAsyncDebounceMs: 500,
    },
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

  const signInEmailId = React.useId();
  const signInEmailPasswordId = React.useId();
  const signInUsernameId = React.useId();
  const signInUsernamePasswordId = React.useId();
  const otpEmailId = React.useId();

  const handleResendOtp = async () => {
    sendOtpMutation.mutate({
      email,
      type: "sign-in",
    });
  };

  const handleGoogleSignIn = async () => {
    socialSignInMutation.mutate({
      provider: "google",
    });
  };

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Enter verification code</h2>
          <p className="text-muted-foreground text-sm">
            We sent a code to <span className="font-medium">{email}</span>
          </p>
        </div>

        <otpVerifyForm.AppForm key="otp-verify">
          <otpVerifyForm.Form className="space-y-4">
            <otpVerifyForm.AppField name="otp">
              {(field) => (
                <field.FieldSet className="w-full flex flex-col items-center">
                  <field.Field className="flex flex-col items-center justify-center *:w-auto">
                    <InputOTP
                      maxLength={6}
                      value={(field.state.value as string) ?? ""}
                      onChange={field.handleChange}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </otpVerifyForm.AppField>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </otpVerifyForm.Form>
        </otpVerifyForm.AppForm>

        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-muted-foreground hover:text-foreground underline"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="text-muted-foreground hover:text-foreground underline"
          >
            Use different method
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isPending}
      >
        {isPending ? (
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* Sign in method tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <Button
          variant="outline"
          onClick={() => setSignInMethod("email")}
          className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
            signInMethod === "email"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Email
        </Button>
        <Button
          variant="outline"
          onClick={() => setSignInMethod("username")}
          className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
            signInMethod === "username"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Username
        </Button>
        <Button
          variant="outline"
          onClick={() => setSignInMethod("otp")}
          className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
            signInMethod === "otp"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          OTP
        </Button>
      </div>

      {signInMethod === "email" && (
        <emailForm.AppForm key="email-signin">
          <emailForm.Form className="space-y-4">
            <emailForm.AppField name="email">
              {(field) => (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={signInEmailId}>Email</field.FieldLabel>
                    <Input
                      id={signInEmailId}
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={(field.state.value as string) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </emailForm.AppField>

            <emailForm.AppField name="password">
              {(field) => (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={signInEmailPasswordId}>Password</field.FieldLabel>
                    <Input
                      id={signInEmailPasswordId}
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={(field.state.value as string) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </emailForm.AppField>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </emailForm.Form>
        </emailForm.AppForm>
      )}

      {signInMethod === "username" && (
        <usernameForm.AppForm key="username-signin">
          <usernameForm.Form className="space-y-4">
            <usernameForm.AppField name="username">
              {(field) => (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={signInUsernameId}>Username</field.FieldLabel>
                    <Input
                      id={signInUsernameId}
                      name="username"
                      placeholder="johndoe"
                      value={(field.state.value as string) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </usernameForm.AppField>

            <usernameForm.AppField name="password">
              {(field) => (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={signInUsernamePasswordId}>Password</field.FieldLabel>
                    <Input
                      id={signInUsernamePasswordId}
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={(field.state.value as string) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </usernameForm.AppField>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </usernameForm.Form>
        </usernameForm.AppForm>
      )}

      {signInMethod === "otp" && (
        <otpRequestForm.AppForm key="otp-request">
          <otpRequestForm.Form className="space-y-4">
            <otpRequestForm.AppField name="email">
              {(field) => (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={otpEmailId}>Email</field.FieldLabel>
                    <Input
                      id={otpEmailId}
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={(field.state.value as string) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                  </field.Field>
                  <field.FieldDescription className="text-xs">
                    We'll send a one-time code to your email
                  </field.FieldDescription>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </otpRequestForm.AppField>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Code
            </Button>
          </otpRequestForm.Form>
        </otpRequestForm.AppForm>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
