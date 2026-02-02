import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Edit2, Loader2, LogOut, Mail } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import * as z from "zod";
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Input } from "@/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { revalidateLogic, useAppForm } from "@/components/ui/tanstack-form";
import { auth, useSession } from "@/lib/auth-client";
import { authMiddleware } from "@/middleware/auth";
import { SidebarProvider } from "@/components/ui/sidebar";

const otpSchema = z.object({
	otp: z.string().length(6, "OTP must be 6 digits"),
});

export const Route = createFileRoute("/verify-email")({
	server: {
		middleware: [authMiddleware],
	},
	component: VerifyEmailPage,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function VerifyEmailPage() {
	const navigate = useNavigate();
	const { data: session } = useSession();
	// Store editing value only when editing, null when not editing
	const [editingEmail, setEditingEmail] = React.useState<string | null>(
		session?.user.email ? null : "",
	);
	// Derive email from editing state or session (no useEffect needed)
	const isEditingEmail = editingEmail !== null;
	const email = editingEmail ?? session?.user.email ?? "";

	const verifyEmailMutation = useMutation(
		auth.emailOtp.verifyEmail.mutationOptions({
			onSuccess: () => {
				toast.success("Email verified successfully!");
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
				toast.success("Verification code resent to your email");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to resend code");
			},
		}),
	);

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

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				navigate({ to: "/" });
			},
		}),
	);

	const handleResend = () => {
		sendOtpMutation.mutate({
			email,
			type: "email-verification",
		});
	};

	const handleSignOut = async () => {
		signOutMutation.mutate({});
	};

	const isPending =
		verifyEmailMutation.isPending ||
		sendOtpMutation.isPending ||
		signOutMutation.isPending;

	return (
		<SidebarProvider defaultOpen={false}>
			<div className="flex flex-col min-h-screen bg-background text-foreground w-full">
				<AppHeader />
				<div className="flex-1 flex flex-col items-center justify-center p-6">
					<div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="flex flex-col items-center text-center space-y-3">
							<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
								<Mail className="w-8 h-8 text-primary" />
							</div>
							<h1 className="text-3xl font-bold tracking-tight">
								Verify your email
							</h1>
							<p className="text-muted-foreground text-sm max-w-xs mx-auto">
								We've sent a 6-digit verification code to
							</p>
						</div>

						<div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
							<div className="space-y-4">
								{isEditingEmail ? (
									<div className="space-y-2">
										<Label htmlFor="email">Email Address</Label>
										<div className="flex gap-2">
											<Input
												type="email"
												placeholder="name@example.com"
												value={email}
												onChange={(e) => setEditingEmail(e.target.value)}
												className="h-11"
											/>
											{session?.user.email && (
												<Button
													variant="outline"
													className="h-11"
													onClick={() => setEditingEmail(null)}
												>
													Cancel
												</Button>
											)}
										</div>
									</div>
								) : (
									<div className="flex flex-col items-center justify-center space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-foreground text-lg">
												{email}
											</span>
											<Button
												onClick={() => setEditingEmail(session?.user.email ?? "")}
												variant="outline"
												title="Edit email"
											>
												<Edit2 className="w-4 h-4 text-muted-foreground" />
											</Button>
										</div>
									</div>
								)}
							</div>
							<otpForm.AppForm key="otp-verify-email">
								<otpForm.Form className="space-y-6">
									<otpForm.AppField name="otp">
										{(field) => (
											<field.FieldSet className="w-full flex flex-col items-center space-y-4">
												<field.Field className="flex justify-center items-center w-full">
													<div className="flex justify-center items-center">
														<InputOTP
															maxLength={6}
															value={(field.state.value as string) ?? ""}
															onChange={field.handleChange}
															aria-invalid={
																!!field.state.meta.errors.length &&
																field.state.meta.isTouched
															}
															disabled={isPending}
														>
															<InputOTPGroup className="flex justify-center items-center">
																<InputOTPSlot
																	index={0}
																	className="w-12 h-14 text-lg text-center"
																/>
																<InputOTPSlot
																	index={1}
																	className="w-12 h-14 text-lg text-center"
																/>
																<InputOTPSlot
																	index={2}
																	className="w-12 h-14 text-lg text-center"
																/>
															</InputOTPGroup>
															<InputOTPSeparator />
															<InputOTPGroup className="flex justify-center items-center">
																<InputOTPSlot
																	index={3}
																	className="w-12 h-14 text-lg text-center"
																/>
																<InputOTPSlot
																	index={4}
																	className="w-12 h-14 text-lg text-center"
																/>
																<InputOTPSlot
																	index={5}
																	className="w-12 h-14 text-lg text-center"
																/>
															</InputOTPGroup>
														</InputOTP>
													</div>
												</field.Field>
												<field.FieldError />
											</field.FieldSet>
										)}
									</otpForm.AppField>

									<Button
										type="submit"
										className="w-full h-12 text-base font-medium"
										disabled={isPending}
									>
										{isPending ? (
											<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										) : (
											"Verify Email"
										)}
									</Button>
								</otpForm.Form>
							</otpForm.AppForm>

							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">
										Didn't receive a code?
									</span>
								</div>
							</div>

							<Button
								variant="outline"
								onClick={handleResend}
								disabled={isPending}
								className="w-full h-11"
							>
								{sendOtpMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									"Resend verification code"
								)}
							</Button>
						</div>

						<div className="flex items-center justify-between px-2">
							<button
								onClick={handleSignOut}
								className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								<LogOut className="mr-2 h-4 w-4" />
								Sign out
							</button>
							<button
								onClick={() => navigate({ to: "/" })}
								className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to home
							</button>
						</div>
					</div>
				</div>
			</div>
		</SidebarProvider>
	);
}
