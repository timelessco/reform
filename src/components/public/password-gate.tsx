import { Eye, EyeOff, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyFormPassword } from "@/lib/fn/public";

interface PasswordGateProps {
  formId: string;
  children: React.ReactNode;
}

function getStorageKey(formId: string) {
  return `bf-unlocked-${formId}`;
}

export function PasswordGate({ formId, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(getStorageKey(formId)) === "1") {
        setUnlocked(true);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [formId]);

  const handleUnlock = useCallback(async () => {
    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyFormPassword({
        data: { formId, password },
      });

      if (result.valid) {
        try {
          sessionStorage.setItem(getStorageKey(formId), "1");
        } catch {
          // sessionStorage unavailable
        }
        setUnlocked(true);
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formId, password]);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Blurred form behind */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="blur-md opacity-50">{children}</div>
      </div>

      {/* Password overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 rounded-lg border bg-white p-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-3">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">Password protected</h2>
              <p className="text-sm text-muted-foreground">
                Enter the password to access this form.
              </p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUnlock();
                  }}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button
                onClick={handleUnlock}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Verifying..." : "Unlock"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
