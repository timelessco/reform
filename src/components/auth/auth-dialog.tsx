

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

type AuthMode = "sign-in" | "sign-up";

interface AuthDialogProps {
	children: React.ReactNode;
	defaultMode?: AuthMode;
	onSuccess?: () => void;
}

export function AuthDialog({
	children,
	defaultMode = "sign-in",
	onSuccess,
}: AuthDialogProps) {
	const [open, setOpen] = React.useState(false);
	const [mode, setMode] = React.useState<AuthMode>(defaultMode);

	const handleSuccess = () => {
		setOpen(false);
		onSuccess?.();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] p-6">
				{mode === "sign-in" ? (
					<SignInForm
						onSuccess={handleSuccess}
						onSwitchToSignUp={() => setMode("sign-up")}
					/>
				) : (
					<SignUpForm
						onSuccess={handleSuccess}
						onSwitchToSignIn={() => setMode("sign-in")}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
