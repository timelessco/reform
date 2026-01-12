import {
	apiKeyClient,
	emailOTPClient,
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
	],
});
export const auth = createAuthQueryClient(authClient);

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
