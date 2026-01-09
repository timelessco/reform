import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { twoFactorClient } from "better-auth/client/plugins";
import { apiKeyClient } from "better-auth/client/plugins";
import { createAuthQueryClient } from "./auth-query";

export const authClient = createAuthClient({
  plugins: [usernameClient(), emailOTPClient() , twoFactorClient(), apiKeyClient()],
});
export const auth = createAuthQueryClient(authClient);

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
