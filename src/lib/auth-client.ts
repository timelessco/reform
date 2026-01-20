import { polarClient } from "@polar-sh/better-auth";
import {
	apiKeyClient,
	emailOTPClient,
	organizationClient,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { createAuthQueryClient } from "./auth-query";

export const authClient = createAuthClient({
	plugins: [
		usernameClient(),
		emailOTPClient(),
		twoFactorClient(),
		apiKeyClient(),
		organizationClient(),
		// @ts-expect-error - Type incompatibility with better-auth 1.4.16
		polarClient(),
	],
});
export const auth = createAuthQueryClient(authClient);

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
