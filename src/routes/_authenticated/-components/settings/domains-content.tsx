import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  GlobeIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
  AlertCircleIcon,
} from "@/components/ui/icons";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth/auth-client";
import { DOMAIN_LIMITS } from "@/lib/config/plan-config";
import {
  addDomain,
  checkDomainStatus,
  orgDomainsQueryOptions,
  removeDomain,
  updateDomainMeta,
} from "@/lib/server-fn/custom-domains";
import { uploadEditorMedia } from "@/lib/server-fn/uploads";

type DomainStatus = "pending" | "verified" | "failed";

type Domain = {
  id: string;
  domain: string;
  status: DomainStatus;
  organizationId: string;
  vercelDomainId: string | null;
  siteTitle: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const MAX_DOMAINS = DOMAIN_LIMITS.maxDomainsPerOrg;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file"));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Failed to read file")),
    );
    reader.readAsDataURL(file);
  });

const StatusBadge = ({ status }: { status: DomainStatus }) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <ClockIcon className="mr-1 size-3" />
          Pending
        </Badge>
      );
    case "verified":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2Icon className="mr-1 size-3" />
          Verified
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <AlertCircleIcon className="mr-1 size-3" />
          Failed
        </Badge>
      );
  }
};

export const DomainsContent = () => {
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const domainInputId = useId();
  const siteTitleInputId = useId();

  const [newDomain, setNewDomain] = useState("");
  const [dnsInfo, setDnsInfo] = useState<{
    domain: string;
    subdomain: string;
  } | null>(null);
  const [verificationRecords, setVerificationRecords] = useState<
    { type: string; domain: string; value: string }[] | null
  >(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingOg, setIsUploadingOg] = useState(false);

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  const orgId = session?.session?.activeOrganizationId as string | undefined;

  // Determine owner status from member list
  const { data: membersData } = useQuery({
    queryKey: ["org-members-for-domains"],
    queryFn: async () => {
      const { authClient } = await import("@/lib/auth/auth-client");
      const result = await authClient.organization.listMembers();
      return result.data;
    },
    enabled: !!orgId,
  });

  const isOwner = useMemo(() => {
    if (!membersData?.members || !session?.user?.id) return false;
    const currentMember = membersData.members.find(
      (m: { userId: string; role: string }) => m.userId === session.user.id,
    );
    return currentMember?.role === "owner";
  }, [membersData, session?.user?.id]);

  const { data: domains = [], isLoading: isLoadingDomains } = useQuery({
    ...orgDomainsQueryOptions(orgId ?? ""),
    enabled: !!orgId,
  });

  const domainCount = domains.length;

  const addMutation = useMutation({
    mutationFn: (domain: string) => addDomain({ data: { orgId: orgId ?? "", domain } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["org-domains", orgId] });
      setNewDomain("");
      const parts = result.domain.split(".");
      const subdomain = parts.length > 2 ? parts[0] : result.domain;
      setDnsInfo({ domain: result.domain, subdomain });
      setVerificationRecords(result.verification?.length ? result.verification : null);
      if (result.warning) {
        toast.error(result.warning);
      } else {
        toast.success("Domain added successfully");
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to add domain");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (domainId: string) => removeDomain({ data: { domainId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-domains", orgId] });
      setConfirmDeleteId(null);
      toast.success("Domain removed");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove domain");
    },
  });

  const checkMutation = useMutation({
    mutationFn: (domainId: string) => checkDomainStatus({ data: { domainId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["org-domains", orgId] });
      if (result.status === "verified") {
        setVerificationRecords(null);
        toast.success("Domain verified!");
        return;
      }
      if (result.verification?.length) {
        setVerificationRecords(result.verification);
      }
      if (result.status === "failed") {
        toast.error("Domain verification failed. Check your DNS records.");
      } else {
        toast("Domain is still pending verification. DNS changes can take up to 48 hours.");
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to check domain status");
    },
  });

  const updateMetaMutation = useMutation({
    mutationFn: (data: {
      domainId: string;
      siteTitle?: string;
      faviconUrl?: string;
      ogImageUrl?: string;
    }) => updateDomainMeta({ data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-domains", orgId] });
      setExpandedConfigId(null);
      toast.success("Domain settings saved");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save domain settings");
    },
  });

  const handleAddDomain = useCallback(() => {
    const trimmed = newDomain.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  }, [newDomain, addMutation]);

  const handleDomainInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewDomain(e.target.value),
    [],
  );

  const handleDomainInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAddDomain();
    },
    [handleAddDomain],
  );

  const handleCopyValue = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const handleOpenConfig = useCallback((domain: Domain) => {
    setExpandedConfigId(domain.id);
    setSiteTitle(domain.siteTitle ?? "");
    setFaviconUrl(domain.faviconUrl ?? "");
    setOgImageUrl(domain.ogImageUrl ?? "");
  }, []);

  const handleSaveConfig = useCallback(
    (domainId: string) => {
      updateMetaMutation.mutate({
        domainId,
        siteTitle: siteTitle || undefined,
        faviconUrl: faviconUrl || undefined,
        ogImageUrl: ogImageUrl || undefined,
      });
    },
    [siteTitle, faviconUrl, ogImageUrl, updateMetaMutation],
  );

  const handleSiteTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSiteTitle(e.target.value),
    [],
  );

  const uploadFile = useCallback(async (file: File, type: "favicon" | "og") => {
    const setUploading = type === "favicon" ? setIsUploadingFavicon : setIsUploadingOg;
    const setUrl = type === "favicon" ? setFaviconUrl : setOgImageUrl;

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadEditorMedia({
        data: {
          base64,
          filename: `domain-${type}-${Date.now()}-${file.name}`,
          contentType: file.type || "image/png",
        },
      });
      setUrl(result.url);
      toast.success(`${type === "favicon" ? "Favicon" : "OG image"} uploaded`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to upload ${type === "favicon" ? "favicon" : "OG image"}`,
      );
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFaviconChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file, "favicon");
    },
    [uploadFile],
  );

  const handleOgChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file, "og");
    },
    [uploadFile],
  );

  const handleFaviconButtonClick = useCallback(() => faviconInputRef.current?.click(), []);
  const handleOgButtonClick = useCallback(() => ogInputRef.current?.click(), []);
  const handleCloseConfig = useCallback(() => setExpandedConfigId(null), []);

  if (isSessionPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && !isSessionPending) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <GlobeIcon className="mx-auto mb-3 size-8 opacity-50" />
        <p>Only the organization owner can manage domains.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor={domainInputId}>
            Add a custom domain
          </label>
          <span className="text-xs text-muted-foreground">
            {domainCount} of {MAX_DOMAINS} domains used
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            id={domainInputId}
            placeholder="forms.acme.com"
            value={newDomain}
            onChange={handleDomainInputChange}
            onKeyDown={handleDomainInputKeyDown}
            disabled={domainCount >= MAX_DOMAINS || addMutation.isPending}
          />
          <Button
            size="sm"
            onClick={handleAddDomain}
            disabled={!newDomain.trim() || domainCount >= MAX_DOMAINS || addMutation.isPending}
            prefix={
              addMutation.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PlusIcon className="size-3.5" />
              )
            }
          >
            Add Domain
          </Button>
        </div>

        {dnsInfo && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Add this CNAME record at your DNS provider:</p>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground font-medium">Type</span>
              <span className="font-mono">CNAME</span>
              <span />

              <span className="text-muted-foreground font-medium">Name</span>
              <span className="font-mono">{dnsInfo.subdomain}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleCopyValue(dnsInfo.subdomain)}
                aria-label="Copy subdomain"
              >
                <CopyIcon className="size-3" />
              </Button>

              <span className="text-muted-foreground font-medium">Value</span>
              <span className="font-mono">cname.vercel-dns.com</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleCopyValue("cname.vercel-dns.com")}
                aria-label="Copy CNAME value"
              >
                <CopyIcon className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {verificationRecords && verificationRecords.length > 0 && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Additional verification required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This domain is claimed by another Vercel project. Add the record(s) below at your
                DNS provider exactly as shown, then click Retry.
              </p>
            </div>
            {verificationRecords.map((rec) => (
              <div
                key={`${rec.type}-${rec.domain}-${rec.value}`}
                className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 text-xs"
              >
                <span className="text-muted-foreground font-medium">Type</span>
                <span className="font-mono">{rec.type}</span>
                <span />

                <span className="text-muted-foreground font-medium">Name</span>
                <span className="font-mono break-all">{rec.domain}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleCopyValue(rec.domain)}
                  aria-label="Copy record name"
                >
                  <CopyIcon className="size-3" />
                </Button>

                <span className="text-muted-foreground font-medium">Value</span>
                <span className="font-mono break-all">{rec.value}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleCopyValue(rec.value)}
                  aria-label="Copy record value"
                >
                  <CopyIcon className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoadingDomains ? (
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <GlobeIcon className="mx-auto mb-3 size-8 opacity-50" />
          <p>No custom domains yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(domains as Domain[]).map((domain) => {
            const isConfirmingDelete = confirmDeleteId === domain.id;
            const isConfiguring = expandedConfigId === domain.id;
            return (
              <div key={domain.id} className="rounded-xl border">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <GlobeIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{domain.domain}</span>
                    <StatusBadge status={domain.status} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isConfirmingDelete ? (
                      <>
                        <span className="text-xs text-muted-foreground mr-1">Are you sure?</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={removeMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMutation.mutate(domain.id)}
                          disabled={removeMutation.isPending}
                          prefix={
                            removeMutation.isPending ? (
                              <Loader2Icon className="size-3 animate-spin" />
                            ) : undefined
                          }
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        {domain.status === "pending" && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => checkMutation.mutate(domain.id)}
                            disabled={checkMutation.isPending}
                            prefix={
                              checkMutation.isPending ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <RefreshCwIcon className="size-4" />
                              )
                            }
                          >
                            Check Status
                          </Button>
                        )}
                        {domain.status === "verified" && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() =>
                              isConfiguring ? handleCloseConfig() : handleOpenConfig(domain)
                            }
                            prefix={<SettingsIcon className="size-4" />}
                          ></Button>
                        )}
                        {domain.status === "failed" && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => checkMutation.mutate(domain.id)}
                            disabled={checkMutation.isPending}
                            prefix={
                              checkMutation.isPending ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <RefreshCwIcon className="size-4" />
                              )
                            }
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeleteId(domain.id)}
                          aria-label={`Remove ${domain.domain}`}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isConfiguring && (
                  <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
                    <div>
                      <label className="text-sm mb-1.5 block" htmlFor={siteTitleInputId}>
                        Site title
                      </label>
                      <Input
                        id={siteTitleInputId}
                        placeholder="My Forms"
                        value={siteTitle}
                        onChange={handleSiteTitleChange}
                      />
                    </div>

                    <div>
                      <span className="text-sm mb-1.5 block">Favicon</span>
                      <div className="flex items-center gap-3">
                        {faviconUrl && (
                          <img
                            src={faviconUrl}
                            alt="Favicon preview"
                            className="size-8 rounded border object-contain"
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFaviconButtonClick}
                          disabled={isUploadingFavicon}
                          prefix={
                            isUploadingFavicon ? (
                              <Loader2Icon className="size-3 animate-spin" />
                            ) : (
                              <UploadIcon className="size-3" />
                            )
                          }
                        >
                          {faviconUrl ? "Replace" : "Upload"} favicon
                        </Button>
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFaviconChange}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-sm mb-1.5 block">OG image</span>
                      <div className="flex flex-col gap-2">
                        {ogImageUrl && (
                          <img
                            src={ogImageUrl}
                            alt="Open Graph preview"
                            className="h-24 w-full rounded border object-cover"
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOgButtonClick}
                          disabled={isUploadingOg}
                          className="w-fit"
                          prefix={
                            isUploadingOg ? (
                              <Loader2Icon className="size-3 animate-spin" />
                            ) : (
                              <UploadIcon className="size-3" />
                            )
                          }
                        >
                          {ogImageUrl ? "Replace" : "Upload"} OG image
                        </Button>
                        <input
                          ref={ogInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleOgChange}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCloseConfig}
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveConfig(domain.id)}
                        disabled={updateMetaMutation.isPending}
                        className="rounded-lg"
                        prefix={
                          updateMetaMutation.isPending ? (
                            <Loader2Icon className="size-3 animate-spin" />
                          ) : undefined
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
