import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, Key, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { auth, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings/my-account")({
	component: MyAccountPage,
	loader: async ({ context }) => {
		const accounts = await context.queryClient.ensureQueryData({
			...auth.listAccounts.queryOptions(),
			revalidateIfStale: true,
		});
		return { accounts };
	},
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function MyAccountPage() {
	const queryClient = useQueryClient();
	const { data: session, isPending: isSessionPending } = useSession();
	const user = session?.user;
	const { accounts: initialAccounts } = Route.useLoaderData();

	// Initialize names from user (no useEffect needed since component waits for session)
	const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] || "");
	const [lastName, setLastName] = useState(
		user?.name?.split(" ").slice(1).join(" ") || "",
	);

	// 2FA State
	const [is2faDialogOpen, setIs2faDialogOpen] = useState(false);
	const [twoFaStep, setTwoFaStep] = useState(1);
	const [totpUri, setTotpUri] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [password, setPassword] = useState("");

	// Accounts Query
	const { data: accounts = [] } = useQuery({
		...auth.listAccounts.queryOptions(),
		initialData: initialAccounts,
	});

	const updateProfileMutation = useMutation(
		auth.updateUser.mutationOptions({
			onSuccess: () => {
				toast.success("Profile updated successfully");
				queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update profile");
			},
		}),
	);

	const setup2faMutation = useMutation({
		mutationFn: async (variables: { password: string }) => {
			const options = auth.twoFactor.getTotpUri.queryOptions(variables);
			return options.queryFn();
		},
		onSuccess: (res) => {
			setTotpUri(res.totpURI);
			setTwoFaStep(2);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to start 2FA setup");
		},
	});

	const enable2faMutation = useMutation(
		auth.twoFactor.enable.mutationOptions({
			onSuccess: () => {
				toast.success("Two-factor authentication enabled");
				setIs2faDialogOpen(false);
				setTwoFaStep(1);
				setPassword("");
				setOtpCode("");
				queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to enable 2FA");
			},
		}),
	);

	const verifyTotpMutation = useMutation(
		auth.twoFactor.verifyTotp.mutationOptions({
			onSuccess: () => {
				enable2faMutation.mutate({ password });
			},
			onError: (error) => {
				toast.error(error.message || "Invalid OTP code");
			},
		}),
	);

	const disable2faMutation = useMutation(
		auth.twoFactor.disable.mutationOptions({
			onSuccess: () => {
				toast.success("Two-factor authentication disabled");
				queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to disable 2FA");
			},
		}),
	);

	const unlinkAccountMutation = useMutation(
		auth.unlinkAccount.mutationOptions({
			onSuccess: (_, variables) => {
				toast.success(`${variables.providerId} disconnected`);
				queryClient.invalidateQueries({
					queryKey: auth.listAccounts.queryKey(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to disconnect account");
			},
		}),
	);

	const deleteAccountMutation = useMutation(
		auth.deleteUser.mutationOptions({
			onSuccess: () => {
				toast.success("Account deleted successfully");
				window.location.href = "/";
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete account");
			},
		}),
	);

	const socialSignInMutation = useMutation(
		auth.signIn.social.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "Failed to connect account");
			},
		}),
	);

	const handleUpdateProfile = async () => {
		updateProfileMutation.mutate({
			name: `${firstName} ${lastName}`.trim(),
		});
	};

	const handleStart2faSetup = async () => {
		if (!password) {
			setTwoFaStep(1);
			setIs2faDialogOpen(true);
			return;
		}
		setup2faMutation.mutate({ password });
	};

	const handleVerifyAndEnable2fa = async () => {
		verifyTotpMutation.mutate({ code: otpCode });
	};

	const handleDisable2fa = async () => {
		const pass = window.prompt("Enter your password to disable 2FA");
		if (!pass) return;
		disable2faMutation.mutate({ password: pass || "" });
	};

	const handleDisconnectAccount = async (providerId: string) => {
		unlinkAccountMutation.mutate({ providerId });
	};

	const handleDeleteAccount = async () => {
		if (
			!window.confirm("Are you absolutely sure? This action cannot be undone.")
		)
			return;
		deleteAccountMutation.mutate({});
	};

	const handleGoogleSignIn = async () => {
		socialSignInMutation.mutate({
			provider: "google",
		});
	};

	const qrCodeUrl = totpUri
		? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpUri)}`
		: "";

	if (isSessionPending) {
		return (
			<div className="flex items-center justify-center p-12">
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="max-w-xl space-y-12 pb-24">
			{/* Profile Section */}
			<section className="space-y-6">
				<div className="space-y-2">
					<label className="text-sm font-medium">Photo</label>
					<div className="flex items-center gap-4">
						<Avatar className="h-24 w-24">
							<AvatarImage src={user?.image || ""} />
							<AvatarFallback className="text-3xl bg-indigo-600 text-white">
								{user?.name?.charAt(0) || "V"}
							</AvatarFallback>
						</Avatar>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6">
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							First name
						</label>
						<Input
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							className="bg-muted/30"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Last name
						</label>
						<Input
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							className="bg-muted/30"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Email
						</label>
						<div className="relative">
							<Input
								value={user?.email || ""}
								readOnly
								className="pr-24 bg-muted/30"
							/>
							<Button
								variant="link"
								className="absolute right-0 top-0 h-full px-4 text-xs"
							>
								Change email
							</Button>
						</div>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Password
						</label>
						<div className="relative">
							<Input
								placeholder="Not set"
								readOnly
								className="pr-24 bg-muted/30"
							/>
							<Button
								variant="link"
								className="absolute right-0 top-0 h-full px-4 text-xs"
							>
								Set password
							</Button>
						</div>
					</div>
				</div>

				<Button
					onClick={handleUpdateProfile}
					disabled={updateProfileMutation.isPending}
					className="bg-black text-white hover:bg-black/90 px-6"
				>
					{updateProfileMutation.isPending ? (
						<Loader2 className="animate-spin mr-2 h-4 w-4" />
					) : null}
					Update
				</Button>
			</section>

			{/* Security Section */}
			<section className="space-y-8 pt-8 border-t">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Key className="h-5 w-5" />
							<h3 className="font-semibold">Two-factor authentication</h3>
							{user?.twoFactorEnabled ? (
								<Badge className="bg-green-500 hover:bg-green-600 text-[10px] uppercase text-white border-0">
									Enabled
								</Badge>
							) : (
								<Badge
									variant="secondary"
									className="font-normal text-[10px] uppercase"
								>
									Disabled
								</Badge>
							)}
						</div>
					</div>
					<p className="text-sm text-muted-foreground max-w-md">
						Secure your account with two-factor authentication which adds an
						additional layer of security during login.
					</p>

					{user?.twoFactorEnabled ? (
						<Button
							variant="outline"
							size="sm"
							onClick={handleDisable2fa}
							className="text-destructive hover:text-destructive font-medium border-destructive/20"
						>
							Disable 2FA
						</Button>
					) : (
						<Dialog
							open={is2faDialogOpen}
							onOpenChange={(open) => {
								setIs2faDialogOpen(open);
								if (!open) setTwoFaStep(1);
							}}
						>
							<DialogTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									onClick={handleStart2faSetup}
									className="bg-black text-white hover:bg-black/80 font-medium"
								>
									Set up
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Set up two-factor authentication</DialogTitle>
									<DialogDescription>
										Follow the steps below to secure your account.
									</DialogDescription>
								</DialogHeader>

								<div className="py-4 space-y-6">
									{twoFaStep === 1 && (
										<div className="space-y-4">
											<div className="space-y-2">
												<p className="text-sm font-medium">
													1. Confirm your password to continue
												</p>
												<Input
													type="password"
													placeholder="Your password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
												/>
											</div>
											<Button
												className="w-full bg-black text-white hover:bg-black/90"
												onClick={handleStart2faSetup}
												disabled={!password || setup2faMutation.isPending}
											>
												{setup2faMutation.isPending ? (
													<Loader2 className="animate-spin mr-2 h-4 w-4" />
												) : null}
												Next
											</Button>
										</div>
									)}

									{twoFaStep === 2 && (
										<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
											<div className="space-y-2">
												<p className="text-sm font-medium">
													2. Scan the QR code with your authenticator app
												</p>
												<div className="flex justify-center p-4 bg-white rounded-lg border border-border shadow-sm">
													{qrCodeUrl ? (
														<img
															src={qrCodeUrl}
															alt="QR Code"
															className="w-40 h-40"
														/>
													) : (
														<div className="w-40 h-40 bg-muted animate-pulse rounded-md" />
													)}
												</div>
											</div>
											<div className="space-y-2">
												<p className="text-sm font-medium">
													3. Enter the code from your app
												</p>
												<div className="flex justify-center">
													<InputOTP
														maxLength={6}
														value={otpCode}
														onChange={setOtpCode}
													>
														<InputOTPGroup>
															<InputOTPSlot index={0} />
															<InputOTPSlot index={1} />
															<InputOTPSlot index={2} />
															<InputOTPSlot index={3} />
															<InputOTPSlot index={4} />
															<InputOTPSlot index={5} />
														</InputOTPGroup>
													</InputOTP>
												</div>
											</div>
											<Button
												className="w-full bg-black text-white hover:bg-black/90"
												onClick={handleVerifyAndEnable2fa}
												disabled={
													otpCode.length < 6 ||
													verifyTotpMutation.isPending ||
													enable2faMutation.isPending
												}
											>
												{verifyTotpMutation.isPending ||
												enable2faMutation.isPending ? (
													<Loader2 className="animate-spin mr-2 h-4 w-4" />
												) : null}
												Enable 2FA
											</Button>
										</div>
									)}
								</div>
							</DialogContent>
						</Dialog>
					)}
				</div>

				<div className="space-y-4 pt-4 border-t">
					<div className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						<h3 className="font-semibold">Connected accounts</h3>
					</div>
					<p className="text-sm text-muted-foreground">
						Connect your account with Google or Apple to enable faster, secure
						and more convenient access.
					</p>

					<div className="space-y-4 pt-2">
						{/* Google Account */}
						<div className="flex items-center justify-between group">
							<div className="flex items-center gap-3">
								<div className="h-6 w-6 flex items-center justify-center">
									<svg viewBox="0 0 24 24" className="h-5 w-5">
										<path
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											fill="#4285F4"
										/>
										<path
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											fill="#34A853"
										/>
										<path
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
											fill="#FBBC05"
										/>
										<path
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											fill="#EA4335"
										/>
									</svg>
								</div>
								<span className="font-medium">Google</span>
								{accounts.find((a) => a.providerId === "google") && (
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
								)}
							</div>
							{accounts.find((a) => a.providerId === "google") ? (
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground font-normal hover:text-destructive"
									onClick={() => handleDisconnectAccount("google")}
								>
									Disconnect
								</Button>
							) : (
								<Button
									variant="ghost"
									size="sm"
									className="text-blue-600 font-normal hover:bg-blue-50"
									onClick={handleGoogleSignIn}
								>
									Connect
								</Button>
							)}
						</div>

						{/* Apple Account - Placeholder (since Apple might not be configured) */}
						<div className="flex items-center justify-between group opacity-50 contrast-50 pointer-events-none">
							<div className="flex items-center gap-3">
								<div className="h-6 w-6 flex items-center justify-center">
									<svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
										<path d="M17.05 20.28c-.96.95-2.03 2.03-3.08 2.03-1.01 0-1.45-.63-2.6-.63-1.16 0-1.63.61-2.6.61-1 0-2.18-1.12-3.13-2.07-1.94-1.94-3.41-5.49-3.41-8.6 0-4.9 3.11-7.49 6.07-7.49 1.58 0 2.9 1 3.73 1 .82 0 2.37-1.07 4.13-1.07 1.25 0 4.25.44 5.92 2.88-3.46 1.63-2.89 6.12.38 7.23-1.11 2.65-2.48 5.11-4.41 7.04zM12.03 3.11c-.13-1.61.94-3.11 2.37-3.11 1.62.01 2.82 1.48 2.6 3.03l-.01.08c-1.44.13-2.82-1.01-2.96-2.42z" />
									</svg>
								</div>
								<span className="font-medium">Apple</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground font-normal"
							>
								Coming soon
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Danger Zone */}
			<section className="space-y-4 pt-12 border-t">
				<div className="flex items-center gap-2 text-destructive">
					<Trash2 className="h-5 w-5" />
					<h3 className="font-semibold">Danger zone</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					This will permanently delete your entire account. All your forms,
					submissions and workspaces will be deleted.
				</p>
				<Button
					variant="destructive"
					size="sm"
					className="font-medium"
					onClick={handleDeleteAccount}
					disabled={deleteAccountMutation.isPending}
				>
					{deleteAccountMutation.isPending ? (
						<Loader2 className="animate-spin mr-2 h-4 w-4" />
					) : null}
					Delete account
				</Button>
			</section>
		</div>
	);
}
