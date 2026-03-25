import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Loader2Icon } from "@/components/ui/icons";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { guestMiddleware } from "@/middleware/auth";
import { Logo } from "@/components/ui/logo";
import { toast } from "sonner";

const SAFE_REDIRECT_PATTERN = /^\/[a-zA-Z0-9\-_/$.~]+$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  const callbackURL =
    redirectTo && SAFE_REDIRECT_PATTERN.test(redirectTo) ? redirectTo : "/dashboard";

  const socialSignInMutation = useMutation({
    mutationFn: async (provider: "google" | "apple") => {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin + callbackURL,
      });
      if (result.error) {
        throw new Error(result.error.message || `Failed to sign in with ${provider}`);
      }
      return result;
    },
    onSuccess: () => {
      sessionStorage.setItem("shouldSyncAfterSocialLogin", "true");
    },
    onError: (error: Error) => {
      sessionStorage.removeItem("shouldSyncAfterSocialLogin");
      toast.error(error.message);
    },
  });

  const isPending = socialSignInMutation.isPending;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[300px] flex-col justify-center">
      <header className="mb-[54px] flex items-center justify-center">
        <Logo className="w-6 h-10 text-foreground/90" />
      </header>

      <main className="flex flex-col items-center justify-center gap-4">
        <Button
          variant="secondary"
          className="w-full rounded-xl font-medium text-base text-primary font-sans"
          size="lg"
          onClick={() =>
            navigate({
              to: "/login/email",
              search: redirectTo ? { redirect: redirectTo } : {},
            })
          }
          disabled={isPending}
        >
          Continue with Email
        </Button>

        <div className="flex w-full gap-3">
          <Button
            variant="secondary"
            className="flex-1 rounded-xl"
            size="icon-lg"
            onClick={() => socialSignInMutation.mutate("google")}
            disabled={isPending}
            aria-label="Continue with Google"
          >
            {socialSignInMutation.isPending && socialSignInMutation.variables === "google" ? (
              <Loader2Icon className="h-4 w-4 animate-spin" aria-label="Loading" />
            ) : (
              <svg
                className="size-5.5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>Google</title>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
          </Button>

          <Button
            variant="secondary"
            className="flex-1 text-secondary-foreground rounded-xl"
            size="icon-lg"
            onClick={() => socialSignInMutation.mutate("apple")}
            disabled={isPending}
            aria-label="Continue with Apple"
          >
            {socialSignInMutation.isPending && socialSignInMutation.variables === "apple" ? (
              <Loader2Icon className="h-4 w-4 animate-spin" aria-label="Loading" />
            ) : (
              <svg className="size-5.5 shrink-0" viewBox="2 2 20 20" fill="currentColor">
                <title>Apple</title>
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute("/login/")({
  server: {
    middleware: [guestMiddleware],
  },
  validateSearch: zodValidator(
    z.object({
      redirect: z.string().optional(),
    }),
  ),
  component: LoginPage,
});
