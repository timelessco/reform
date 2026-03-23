import { polarClient } from "@polar-sh/better-auth";
import {
  emailOTPClient,
  organizationClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { createAuthQueryClient } from "./auth-query";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const url = process.env.VERCEL_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    usernameClient(),
    emailOTPClient(),
    twoFactorClient(),
    // apiKeyClient(), // TODO: requires @better-auth/api-key package
    organizationClient(),
    polarClient(),
  ],
});
export const auth = createAuthQueryClient(authClient);

export const { useSession } = authClient;
