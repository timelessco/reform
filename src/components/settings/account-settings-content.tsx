import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Camera,
  ImageIcon,
  Loader2,
  Mail,
  Monitor,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImageCrop,
  ImageCropApply,
  ImageCropContent,
  ImageCropReset,
} from "@/components/ui/image-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, useSession } from "@/lib/auth-client";
import { uploadAvatar } from "@/lib/fn/upload";
import { useTheme } from "@/components/ThemeProvider";

function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <Select value={theme} onValueChange={(val) => setTheme(val as "dark" | "light" | "system")}>
      <SelectTrigger size="sm" className="shrink-0 h-[30px] bg-[var(--gray-50)] border-0 rounded-lg shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] pl-3 pr-[10px] text-[13px] font-medium text-[var(--gray-800)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">System</SelectItem>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AccountSettingsContent() {
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;

  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    user?.name?.split(" ").slice(1).join(" ") || "",
  );

  // 2FA State
  const [is2faDialogOpen, setIs2faDialogOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState(1);
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const firstNameId = useId();
  const lastNameId = useId();

  // Username state
  const [username, setUsername] = useState(user?.name?.split(" ")[0]?.toLowerCase() || "");

  // Change email state
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Profile picture state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts Query
  const { data: accounts = [] } = useQuery({
    ...auth.listAccounts.queryOptions(),
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

  const setup2faMutation = useMutation(
    auth.twoFactor.enable.mutationOptions({
      onSuccess: (res) => {
        setTotpUri(res.totpURI);
        setBackupCodes(res.backupCodes || []);
        setTwoFaStep(2);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start 2FA setup");
      },
    }),
  );

  const verifyTotpMutation = useMutation(
    auth.twoFactor.verifyTotp.mutationOptions({
      onSuccess: () => {
        toast.success("Two-factor authentication enabled");
        setIs2faDialogOpen(false);
        setTwoFaStep(1);
        setPassword("");
        setOtpCode("");
        setTotpUri("");
        setBackupCodes([]);
        queryClient.invalidateQueries({ queryKey: auth.getSession.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Invalid OTP code. Please try again.");
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
      onSuccess: () => {
        sessionStorage.setItem("shouldSyncAfterSocialLogin", "true");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to connect account");
      },
    }),
  );

  const changeEmailMutation = useMutation(
    auth.changeEmail.mutationOptions({
      onSuccess: () => {
        toast.success("Verification email sent to your new address. Please check your inbox.");
        setNewEmail("");
        setIsChangeEmailOpen(false);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to change email");
      },
    }),
  );

  // Profile picture upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (base64: string) => {
      const { url } = await uploadAvatar({ data: { base64 } });
      await updateProfileMutation.mutateAsync({ image: url });
      return url;
    },
    onSuccess: () => {
      setIsAvatarDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload image");
    },
  });

  const handleUpdateProfile = async () => {
    updateProfileMutation.mutate({
      name: `${firstName} ${lastName}`.trim(),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsAvatarDialogOpen(true);
    }
    e.target.value = "";
  };

  const handleCroppedImage = async (croppedImage: string) => {
    await uploadAvatarMutation.mutateAsync(croppedImage);
  };

  const handleVerifyAndEnable2fa = async () => {
    verifyTotpMutation.mutate({ code: otpCode });
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
      callbackURL: window.location.origin,
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
    <div className="flex flex-col gap-10">
      {/* Profile Section: Avatar + Name + Username */}
      {/* Avatar row */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer p-0 h-auto rounded-full"
        >
          <Avatar className="size-[46px]">
            <AvatarImage src={user?.image || ""} />
            <AvatarFallback className="text-base bg-indigo-600 text-white">
              {user?.name?.charAt(0) || "V"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-4 w-4 text-white" />
          </div>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-[30px] bg-[var(--gray-50)] rounded-lg shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] px-2 text-[13px] font-medium cursor-pointer hover:bg-[var(--gray-100)] transition-colors flex items-center gap-1.5"
          >
            <ImageIcon className="size-4" />
            Upload image
          </button>
          {user?.image && (
            <button
              type="button"
              onClick={() => updateProfileMutation.mutate({ image: "" })}
              className="h-[30px] bg-[var(--gray-100)] rounded-lg px-2 text-[13px] font-medium text-[var(--gray-700)] cursor-pointer hover:bg-[var(--gray-200)] transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Display name + Username side by side */}
      <div className="flex items-start gap-3 mt-2.5">
        <div className="flex-1 flex flex-col gap-1.5">
          <label
            className="text-sm text-(--gray-600) tracking-[0.28px]"
            htmlFor={firstNameId}
          >
            Display name
          </label>
            <InputGroup className="h-[30px] bg-(--gray-100) border-0 overflow-clip pr-[3px]">
              <InputGroupInput
                id={firstNameId}
                value={`${firstName} ${lastName}`.trim()}
                onChange={(e) => {
                  const parts = e.target.value.split(" ");
                  setFirstName(parts[0] || "");
                  setLastName(parts.slice(1).join(" "));
                }}
                placeholder="Enter display name"
                className="h-[30px] text-sm text-(--gray-800)"
              />
              <InputGroupButton
                onClick={handleUpdateProfile}
                disabled={updateProfileMutation.isPending}
                className="h-[24px] rounded-[5px] px-2 bg-[var(--gray-50)] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] text-[13px] text-[var(--gray-800)] hover:bg-[var(--gray-100)]"
              >
                Save
              </InputGroupButton>
            </InputGroup>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label
              className="text-sm text-(--gray-600) tracking-[0.28px]"
              htmlFor={lastNameId}
            >
              Username
            </label>
            <InputGroup className="h-[30px] bg-(--gray-100) border-0 overflow-clip pr-[3px]">
              <InputGroupInput
                id={lastNameId}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-[30px] text-sm text-(--gray-800)"
              />
              <InputGroupButton
                onClick={handleUpdateProfile}
                disabled={updateProfileMutation.isPending}
                className="h-[24px] rounded-[5px] px-2 bg-[var(--gray-50)] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] text-[13px] text-[var(--gray-800)] hover:bg-[var(--gray-100)]"
              >
                Save
              </InputGroupButton>
            </InputGroup>
          </div>
        </div>

      {/* Email Section */}
      <section className="flex flex-col gap-[10px]">
        <h3 className="text-sm font-medium text-(--gray-900)">Email</h3>
        <div className="bg-[var(--gray-100)] rounded-xl pl-2 pr-2.5 py-2 flex items-center gap-3">
          <div className="size-[38px] rounded-lg flex items-center justify-center shrink-0">
            <Mail className="size-[22px] text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email || ""}</p>
            <p className="text-sm text-(--gray-600)">Current email</p>
          </div>
          <button
            type="button"
            onClick={() => setIsChangeEmailOpen(!isChangeEmailOpen)}
            className="h-[30px] bg-[var(--gray-50)] rounded-lg shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] px-3 text-[13px] font-medium cursor-pointer hover:bg-[var(--gray-100)] transition-colors shrink-0"
          >
            Change email
          </button>
        </div>
        {isChangeEmailOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newEmail) return;
              changeEmailMutation.mutate({
                newEmail,
                callbackURL: window.location.origin,
              });
            }}
            className="flex gap-3"
          >
            <InputGroup className="h-[30px] flex-1 bg-(--gray-100) border-0 overflow-clip pr-[3px]">
              <InputGroupInput
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                required
                className="h-[30px] text-sm text-(--gray-800)"
              />
              <InputGroupButton
                type="submit"
                disabled={changeEmailMutation.isPending || !newEmail}
                className="h-[24px] rounded-[5px] px-2 bg-[var(--gray-50)] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] text-[13px] text-[var(--gray-800)] hover:bg-[var(--gray-100)]"
              >
                {changeEmailMutation.isPending ? "Sending..." : "Verify"}
              </InputGroupButton>
            </InputGroup>
          </form>
        )}
      </section>

      {/* Appearance Section */}
      <section className="flex flex-col gap-[10px]">
        <h3 className="text-sm font-medium text-(--gray-900)">Appearance</h3>
        <div className="bg-[var(--gray-100)] rounded-xl pl-2 pr-2.5 py-2 flex items-center gap-3">
          <div className="size-[38px] rounded-lg flex items-center justify-center shrink-0">
            <Monitor className="size-[22px] text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Choose light/dark mode</p>
          </div>
          <ThemeSelect />
        </div>
      </section>

      {/* Connected Account Section */}
      <section className="flex flex-col gap-[10px]">
        <h3 className="text-sm font-medium text-(--gray-900)">Connected account</h3>
        <div className="bg-[var(--gray-100)] rounded-xl pl-2 pr-2.5 py-2 flex items-center gap-3">
          <div className="size-[38px] rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="size-[22px]">
              <title>Google logo</title>
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {accounts.find((a) => a.providerId === "google")
                ? user?.email || "Google account"
                : "Google"}
            </p>
            <p className="text-sm text-(--gray-600)">
              {accounts.find((a) => a.providerId === "google") ? "Current email" : "Not connected"}
            </p>
          </div>
          {accounts.find((a) => a.providerId === "google") ? (
            <button
              type="button"
              onClick={() => handleDisconnectAccount("google")}
              className="h-[30px] bg-[var(--gray-50)] rounded-lg shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] px-3 text-[13px] font-medium cursor-pointer hover:bg-[var(--gray-100)] transition-colors shrink-0"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="h-[30px] bg-[var(--gray-50)] rounded-lg shadow-[0px_1px_1px_0px_rgba(0,0,0,0.12),0px_0px_0px_0.5px_rgba(0,0,0,0.16)] px-3 text-[13px] font-medium cursor-pointer hover:bg-[var(--gray-100)] transition-colors shrink-0"
            >
              Connect
            </button>
          )}
        </div>
        {accounts.find((a) => a.providerId === "google") && (
          <div className="flex items-center gap-2">
            <AlertCircle className="size-[18px] text-(--gray-600) shrink-0" />
              <p className="text-[13px] text-(--gray-600) leading-[1.5]">
              You have logged in with your Google account.
            </p>
          </div>
        )}
      </section>

      {/* Delete Account Section */}
      <section className="flex flex-col gap-[10px]">
              <h3 className="text-sm font-medium text-(--gray-900)">Delete account</h3>
        <p className="text-sm text-(--gray-800) leading-[1.5]">
          This will permanently delete your entire account. All your forms,
          submissions and workspaces will be deleted.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleteAccountMutation.isPending}
            className="w-full bg-(--gray-100) rounded-lg px-2.5 py-[7px] flex items-center gap-1.5 cursor-pointer hover:bg-(--gray-200) transition-colors disabled:opacity-50"
        >
          {deleteAccountMutation.isPending ? (
              <Loader2 className="animate-spin size-3 text-(--red-500)" />
          ) : (
            <TriangleAlert className="size-3 text-(--red-500)" />
          )}
          <span className="text-(--red-500) text-sm font-medium">
            Delete my account
          </span>
        </button>
      </section>

      {/* 2FA Dialog */}
      <Dialog
        open={is2faDialogOpen}
        onOpenChange={(open) => {
          setIs2faDialogOpen(open);
          if (!open) setTwoFaStep(1);
        }}
      >
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
                  onClick={() =>
                    setup2faMutation.mutate({ password })
                  }
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
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                  <p className="text-sm font-medium text-amber-600">
                    Backup codes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Save these codes securely. Each code can be used once
                    to access your account if you lose your authenticator.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    {backupCodes.map((code) => (
                      <code key={code} className="text-sm font-mono">
                        {code}
                      </code>
                    ))}
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
                    otpCode.length < 6 || verifyTotpMutation.isPending
                  }
                >
                  {verifyTotpMutation.isPending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : null}
                  Enable 2FA
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      <Dialog
        open={isAvatarDialogOpen}
        onOpenChange={(open) => {
          setIsAvatarDialogOpen(open);
          if (!open) setSelectedFile(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
            <DialogDescription>
              Adjust the crop area to set your profile picture.
            </DialogDescription>
          </DialogHeader>

          {selectedFile && (
            <ImageCrop
              file={selectedFile}
              aspect={1}
              circularCrop
              onCrop={handleCroppedImage}
            >
              <div className="space-y-4">
                <ImageCropContent className="max-h-[300px]" />

                <div className="flex justify-between">
                  <ImageCropReset
                    render={<Button variant="outline" size="sm" />}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </ImageCropReset>

                  <ImageCropApply
                    render={
                      <Button
                        disabled={uploadAvatarMutation.isPending}
                        className="bg-black text-white hover:bg-black/90"
                      />
                    }
                  >
                    {uploadAvatarMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Uploading...
                      </>
                    ) : (
                      "Save photo"
                    )}
                  </ImageCropApply>
                </div>
              </div>
            </ImageCrop>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
