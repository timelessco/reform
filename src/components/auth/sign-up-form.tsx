"use client";

import { useMutation } from "@tanstack/react-query";
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

const signUpSchema = z.object({
	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(30, "Username must be at most 30 characters")
		.regex(
			/^[a-zA-Z0-9._]+$/,
			"Username can only contain letters, numbers, dots, and underscores",
		),
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

interface SignUpFormProps {
	onSuccess?: () => void;
	onSwitchToSignIn?: () => void;
}

export function SignUpForm({ onSuccess, onSwitchToSignIn }: SignUpFormProps) {
	const [step, setStep] = React.useState<"form" | "otp">("form");
	const [email, setEmail] = React.useState("");

	const signUpMutation = useMutation(
		auth.signUp.email.mutationOptions({
			onSuccess: async (_, variables) => {
				setEmail(variables.email);
				// Send OTP for email verification
				sendOtpMutation.mutate({
					email: variables.email,
					type: "email-verification",
				});
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
			onSuccess: () => {
				toast.success("Email verified successfully!");
				onSuccess?.();
			},
			onError: (error) => {
				toast.error(error.message || "Verification failed");
			},
		}),
	);

	const sendOtpMutation = useMutation(
		auth.emailOtp.sendVerificationOtp.mutationOptions({
			onSuccess: () => {
				toast.success("OTP resent to your email");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to send OTP");
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
			onError: (error) => {
				toast.error(error.message || "Failed to sign in with Google");
			},
		}),
	);

	const handleGoogleSignIn = async () => {
		socialSignInMutation.mutate({
			provider: "google",
		});
	};

	const isPending =
		signUpMutation.isPending ||
		verifyEmailMutation.isPending ||
		sendOtpMutation.isPending ||
		socialSignInMutation.isPending;

	const handleResendOtp = async () => {
		sendOtpMutation.mutate({
			email,
			type: "email-verification",
		});
	};

	if (step === "otp") {
		return (
			<div className="space-y-6">
				<div className="space-y-2 text-center">
					<h2 className="text-2xl font-bold">Verify your email</h2>
					<p className="text-muted-foreground text-sm">
						We sent a verification code to{" "}
						<span className="font-medium">{email}</span>
					</p>
				</div>

				<otpForm.AppForm>
					<otpForm.Form className="space-y-4">
						<otpForm.AppField name="otp">
							{(field) => (
								<field.FieldSet className="w-full flex flex-col items-center">
									<field.Field>
										<InputOTP
											maxLength={6}
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
											aria-invalid={
												!!field.state.meta.errors.length &&
												field.state.meta.isTouched
											}
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
						</otpForm.AppField>

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Verify Email
						</Button>
					</otpForm.Form>
				</otpForm.AppForm>

				<div className="text-center">
					<button
						type="button"
						onClick={handleResendOtp}
						className="text-sm text-muted-foreground hover:text-foreground underline"
					>
						Didn't receive the code? Resend
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2 text-center">
				<h2 className="text-2xl font-bold">Create an account</h2>
				<p className="text-muted-foreground text-sm">
					Enter your details to get started
				</p>
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
					<span className="bg-background px-2 text-muted-foreground">
						Or continue with
					</span>
				</div>
			</div>

			<signUpForm.AppForm>
				<signUpForm.Form className="space-y-4">
					<signUpForm.AppField name="name">
						{(field) => (
							<field.FieldSet className="w-full">
								<field.Field>
									<field.FieldLabel htmlFor="name">Name</field.FieldLabel>
									<Input
										id="name"
										name="name"
										placeholder="John Doe"
										value={(field.state.value as string) ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={
											!!field.state.meta.errors.length &&
											field.state.meta.isTouched
										}
									/>
								</field.Field>
								<field.FieldError />
							</field.FieldSet>
						)}
					</signUpForm.AppField>

					<signUpForm.AppField name="username">
						{(field) => (
							<field.FieldSet className="w-full">
								<field.Field>
									<field.FieldLabel htmlFor="username">
										Username
									</field.FieldLabel>
									<Input
										id="username"
										name="username"
										placeholder="johndoe"
										value={(field.state.value as string) ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={
											!!field.state.meta.errors.length &&
											field.state.meta.isTouched
										}
									/>
								</field.Field>
								<field.FieldError />
							</field.FieldSet>
						)}
					</signUpForm.AppField>

					<signUpForm.AppField name="email">
						{(field) => (
							<field.FieldSet className="w-full">
								<field.Field>
									<field.FieldLabel htmlFor="email">Email</field.FieldLabel>
									<Input
										id="email"
										name="email"
										type="email"
										placeholder="john@example.com"
										value={(field.state.value as string) ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={
											!!field.state.meta.errors.length &&
											field.state.meta.isTouched
										}
									/>
								</field.Field>
								<field.FieldError />
							</field.FieldSet>
						)}
					</signUpForm.AppField>

					<signUpForm.AppField name="password">
						{(field) => (
							<field.FieldSet className="w-full">
								<field.Field>
									<field.FieldLabel htmlFor="password">
										Password
									</field.FieldLabel>
									<Input
										id="password"
										name="password"
										type="password"
										placeholder="Enter your password"
										value={(field.state.value as string) ?? ""}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={
											!!field.state.meta.errors.length &&
											field.state.meta.isTouched
										}
									/>
								</field.Field>
								<field.FieldDescription className="text-xs">
									At least 8 characters with uppercase, lowercase, and number
								</field.FieldDescription>
								<field.FieldError />
							</field.FieldSet>
						)}
					</signUpForm.AppField>

					<Button type="submit" className="w-full" disabled={isPending}>
						{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Create Account
					</Button>
				</signUpForm.Form>
			</signUpForm.AppForm>

			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<button
					type="button"
					onClick={onSwitchToSignIn}
					className="font-medium text-primary hover:underline"
				>
					Sign in
				</button>
			</p>
		</div>
	);
}
