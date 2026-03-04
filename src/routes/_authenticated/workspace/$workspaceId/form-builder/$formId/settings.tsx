import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { revalidateLogic, useAppForm } from "@/components/ui/tanstack-form";
import { Textarea } from "@/components/ui/textarea";
import { formCollection, localFormCollection } from "@/db-collections";
import { useForm, useLocalForm } from "@/hooks/use-live-hooks";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/settings",
)({
  component: SettingsPage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function SettingsPage() {
  const { formId } = Route.useParams();
  return <SettingsContent formId={formId} />;
}

export function SettingsContent({ formId, isLocal }: { formId: string; isLocal?: boolean }) {
  const cloudForm = useForm(isLocal ? undefined : formId);
  const localFormResult = useLocalForm(isLocal ? formId : undefined);
  const formResult = isLocal ? localFormResult : cloudForm;
  const formDoc = formResult.data?.[0] ?? null;
  const collection = isLocal ? localFormCollection : formCollection;

  const form = useAppForm({
    defaultValues: formDoc ? {
      language: formDoc.language ?? "English",
      redirectOnCompletion: formDoc.redirectOnCompletion ?? false,
      redirectUrl: formDoc.redirectUrl ?? null,
      redirectDelay: formDoc.redirectDelay ?? 0,
      progressBar: formDoc.progressBar ?? false,
      branding: formDoc.branding ?? true,
      dataRetention: formDoc.dataRetention ?? false,
      dataRetentionDays: formDoc.dataRetentionDays ?? null,
      selfEmailNotifications: formDoc.selfEmailNotifications ?? false,
      notificationEmail: formDoc.notificationEmail ?? null,
      respondentEmailNotifications: formDoc.respondentEmailNotifications ?? false,
      respondentEmailSubject: formDoc.respondentEmailSubject ?? null,
      respondentEmailBody: formDoc.respondentEmailBody ?? null,
      passwordProtect: formDoc.passwordProtect ?? false,
      password: formDoc.password ?? null,
      closeForm: formDoc.closeForm ?? false,
      closedFormMessage: formDoc.closedFormMessage ?? null,
      closeOnDate: formDoc.closeOnDate ?? false,
      closeDate: formDoc.closeDate ?? null,
      limitSubmissions: formDoc.limitSubmissions ?? false,
      maxSubmissions: formDoc.maxSubmissions ?? null,
      preventDuplicateSubmissions: formDoc.preventDuplicateSubmissions ?? false,
      autoJump: formDoc.autoJump ?? false,
      saveAnswersForLater: formDoc.saveAnswersForLater ?? true,
    } : {
      language: "English",
      redirectOnCompletion: false,
      redirectUrl: null,
      redirectDelay: 0,
      progressBar: false,
      branding: true,
      dataRetention: false,
      dataRetentionDays: null,
      selfEmailNotifications: false,
      notificationEmail: null,
      respondentEmailNotifications: false,
      respondentEmailSubject: null,
      respondentEmailBody: null,
      passwordProtect: false,
      password: null,
      closeForm: false,
      closedFormMessage: null,
      closeOnDate: false,
      closeDate: null,
      limitSubmissions: false,
      maxSubmissions: null,
      preventDuplicateSubmissions: false,
      autoJump: false,
      saveAnswersForLater: true,
    },
    validationLogic: revalidateLogic(),
    listeners: {
      onChange: ({ formApi }) => {
        const values = formApi.state.values;
        const settingsFields = {
          language: values.language,
          redirectOnCompletion: values.redirectOnCompletion,
          redirectUrl: values.redirectUrl,
          redirectDelay: values.redirectDelay,
          progressBar: values.progressBar,
          branding: values.branding,
          dataRetention: values.dataRetention,
          dataRetentionDays: values.dataRetentionDays,
          selfEmailNotifications: values.selfEmailNotifications,
          notificationEmail: values.notificationEmail,
          respondentEmailNotifications: values.respondentEmailNotifications,
          respondentEmailSubject: values.respondentEmailSubject,
          respondentEmailBody: values.respondentEmailBody,
          passwordProtect: values.passwordProtect,
          password: values.password,
          closeForm: values.closeForm,
          closedFormMessage: values.closedFormMessage,
          closeOnDate: values.closeOnDate,
          closeDate: values.closeDate,
          limitSubmissions: values.limitSubmissions,
          maxSubmissions: values.maxSubmissions,
          preventDuplicateSubmissions: values.preventDuplicateSubmissions,
          autoJump: values.autoJump,
          saveAnswersForLater: values.saveAnswersForLater,
        };

        if (formDoc?.id) {
          collection.update(formDoc.id, (draft) => {
            Object.assign(draft, settingsFields);
            draft.updatedAt = new Date().toISOString();
          });
        }
      },
      onChangeDebounceMs: 500,
    },
  });

  return (
    <div className="space-y-8 pb-20">
      <form.AppForm>
        <form.Form className="p-0 gap-8">
          {/* General Section */}
          <Section title="General">
            <SettingItem
              title="Language"
              description="Choose in what language the respondents will see your form. This applies to the text which is not customized by you, e.g. default buttons, errors, etc."
            >
              <form.AppField name="language">
                {(field) => (
                  <Select
                    value={(field.state.value as string) || "English"}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </form.AppField>
            </SettingItem>

            <SettingItem
              title="Redirect on completion"
              description="Redirect to a custom URL when the form is submitted."
            >
              <form.AppField name="redirectOnCompletion">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            {/* Conditional redirect URL and delay fields */}
            <form.Subscribe selector={(state) => state.values.redirectOnCompletion}>
              {(redirectOnCompletion) =>
                redirectOnCompletion ? (
                  <>
                    <SettingItem
                      title="Redirect URL"
                      description="The URL to redirect to after form submission."
                      vertical
                    >
                      <form.AppField name="redirectUrl">
                        {(field) => (
                          <Input
                            type="url"
                            placeholder="https://example.com/thank-you"
                            value={(field.state.value as string) || ""}
                            onChange={(e) => field.handleChange(e.target.value || null)}
                            className="w-full h-9"
                          />
                        )}
                      </form.AppField>
                    </SettingItem>

                    <SettingItem
                      title="Redirect delay (seconds)"
                      description="How long to show the thank you page before redirecting. Set to 0 for immediate redirect."
                    >
                      <form.AppField name="redirectDelay">
                        {(field) => (
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            placeholder="0"
                            value={(field.state.value as number) || 0}
                            onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
                            className="w-[100px] h-9"
                          />
                        )}
                      </form.AppField>
                    </SettingItem>
                  </>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title="Progress bar"
              description="The progress bar provides a clear way for respondents to understand how much of the form they have completed, and encourages them to continue until the end."
            >
              <form.AppField name="progressBar">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <SettingItem
              title={
                <span>
                  BetterForms branding{" "}
                  <Badge
                    variant="secondary"
                    className="bg-pink-100 text-pink-600 border-none text-[10px] h-4 px-1.5 ml-1"
                  >
                    Pro
                  </Badge>
                </span>
              }
              description='Show "Made with BetterForms" on your form.'
            >
              <form.AppField name="branding">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>
            {/* TODO: Future feature */}
            <SettingItem
              title={
                <span>
                  Submissions data retention{" "}
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-600 border-none text-[10px] h-4 px-1.5 ml-1 uppercase"
                  >
                    Business
                  </Badge>
                </span>
              }
              description="Automatically delete form submissions after a set period. Enable this option to define how long submissions are stored before they're deleted. When disabled, submissions will be retained until manually deleted."
            >
              <form.AppField name="dataRetention">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.dataRetention}>
              {(dataRetention) =>
                dataRetention ? (
                  <SettingItem
                    title="Retention period (days)"
                    description="Number of days to retain submission data before automatic deletion."
                  >
                    <form.AppField name="dataRetentionDays">
                      {(field) => (
                        <Input
                          type="number"
                          min={1}
                          placeholder="30"
                          value={(field.state.value as number) || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-[100px] h-9"
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>
          </Section>

          {/* Email Notifications Section */}
          <Section title="Email notifications">
            <SettingItem
              title="Self email notifications"
              description="Get an email for new form submissions."
            >
              <form.AppField name="selfEmailNotifications">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.selfEmailNotifications}>
              {(selfEmailNotifications) =>
                selfEmailNotifications ? (
                  <SettingItem
                    title="Notification email"
                    description="Email address to receive submission notifications. Leave empty to use your account email."
                    vertical
                  >
                    <form.AppField name="notificationEmail">
                      {(field) => (
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={(field.state.value as string) || ""}
                          onChange={(e) => field.handleChange(e.target.value || null)}
                          className="w-full h-9"
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title={
                <span>
                  Respondent email notifications{" "}
                  <Badge
                    variant="secondary"
                    className="bg-pink-100 text-pink-600 border-none text-[10px] h-4 px-1.5 ml-1"
                  >
                    Pro
                  </Badge>
                </span>
              }
              description="Send a customized text email to respondents after form submission."
            >
              <form.AppField name="respondentEmailNotifications">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.respondentEmailNotifications}>
              {(respondentEmailNotifications) =>
                respondentEmailNotifications ? (
                  <>
                    <SettingItem
                      title="Email subject"
                      description="Subject line for the confirmation email sent to respondents."
                      vertical
                    >
                      <form.AppField name="respondentEmailSubject">
                        {(field) => (
                          <Input
                            type="text"
                            placeholder="Thank you for your submission"
                            value={(field.state.value as string) || ""}
                            onChange={(e) => field.handleChange(e.target.value || null)}
                            className="w-full h-9"
                          />
                        )}
                      </form.AppField>
                    </SettingItem>
                    <SettingItem
                      title="Email body"
                      description="Message body for the confirmation email. The respondent's email is auto-detected from submission data."
                      vertical
                    >
                      <form.AppField name="respondentEmailBody">
                        {(field) => (
                          <Textarea
                            placeholder="Thank you for filling out our form. We'll be in touch soon."
                            value={(field.state.value as string) || ""}
                            onChange={(e) => field.handleChange(e.target.value || null)}
                            className="w-full min-h-[80px]"
                          />
                        )}
                      </form.AppField>
                    </SettingItem>
                  </>
                ) : null
              }
            </form.Subscribe>
          </Section>

          {/* Access Section */}
          <Section title="Access">
            <SettingItem
              title="Password protect form"
              description="Enable this setting to require a password before respondents can access the form."
            >
              <form.AppField name="passwordProtect">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.passwordProtect}>
              {(passwordProtect) =>
                passwordProtect ? (
                  <SettingItem
                    title="Password"
                    description="Respondents must enter this password to access the form."
                  >
                    <form.AppField name="password">
                      {(field) => (
                        <PasswordInput
                          value={(field.state.value as string) || ""}
                          onChange={(val) => field.handleChange(val || null)}
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title="Close form"
              description="People won't be able to respond to this form anymore."
            >
              <form.AppField name="closeForm">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.closeForm}>
              {(closeForm) =>
                closeForm ? (
                  <SettingItem
                    title="Closed form message"
                    description="Message displayed when someone tries to access the closed form."
                    vertical
                  >
                    <form.AppField name="closedFormMessage">
                      {(field) => (
                        <Textarea
                          placeholder="This form is now closed."
                          value={(field.state.value as string) || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || "This form is now closed.")
                          }
                          className="w-full min-h-[60px]"
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title="Close form on a scheduled date"
              description="Schedule a date on which the form will be closed for new submissions."
            >
              <form.AppField name="closeOnDate">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.closeOnDate}>
              {(closeOnDate) =>
                closeOnDate ? (
                  <SettingItem
                    title="Close date"
                    description="The form will stop accepting responses after this date and time."
                  >
                    <form.AppField name="closeDate">
                      {(field) => (
                        <Input
                          type="datetime-local"
                          value={(field.state.value as string) || ""}
                          onChange={(e) => field.handleChange(e.target.value || null)}
                          className="w-[220px] h-9"
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title="Limit number of submissions"
              description="Set how many submissions you want to receive in total."
            >
              <form.AppField name="limitSubmissions">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.limitSubmissions}>
              {(limitSubmissions) =>
                limitSubmissions ? (
                  <SettingItem
                    title="Maximum submissions"
                    description="The form will stop accepting responses after reaching this number."
                  >
                    <form.AppField name="maxSubmissions">
                      {(field) => (
                        <Input
                          type="number"
                          min={1}
                          placeholder="100"
                          value={(field.state.value as number) || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-[100px] h-9"
                        />
                      )}
                    </form.AppField>
                  </SettingItem>
                ) : null
              }
            </form.Subscribe>

            <SettingItem
              title="Prevent duplicate submissions"
              description="Ensure each respondent can only submit the form once by selecting a form field (e.g. email address, phone number, IP address) that will be used as a unique identifier. This allows our system to detect and prevent duplicate submissions."
            >
              <form.AppField name="preventDuplicateSubmissions">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <form.Subscribe selector={(state) => state.values.preventDuplicateSubmissions}>
              {(preventDuplicateSubmissions) =>
                preventDuplicateSubmissions ? (
                  <div className="ml-0 pl-0">
                    <p className="text-xs text-muted-foreground italic">
                      Duplicate submissions are detected using a browser cookie. Respondents using a
                      different browser or clearing cookies can submit again.
                    </p>
                  </div>
                ) : null
              }
            </form.Subscribe>
          </Section>

          {/* Behavior Section */}
          <Section title="Behavior">
            <SettingItem
              title="Auto-jump to next page"
              description="Automatically jump to the next page when a question gets answered. Only works with one multiple choice, dropdown, rating or linear scale question per page."
            >
              <form.AppField name="autoJump">
                {(field) => (
                  <Switch checked={!!field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>

            <SettingItem
              title="Save answers for later"
              description="Save answers of non-submitted forms, so respondents can continue from where they left off. The answers are stored in the local browser storage and never leave the respondent's computer."
            >
              <form.AppField name="saveAnswersForLater">
                {(field) => (
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                )}
              </form.AppField>
            </SettingItem>
          </Section>
        </form.Form>
      </form.AppForm>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

function SettingItem({
  title,
  description,
  children,
  vertical = false,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-8",
        vertical ? "flex-col items-stretch" : "items-start justify-between",
      )}
    >
      <div className="space-y-1 max-w-xl">
        <Label className="text-sm font-semibold">{title}</Label>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className={cn("shrink-0 flex items-center", !vertical && "pt-1")}>{children}</div>
    </div>
  );
}

function SettingRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="space-y-2 flex-1 max-w-xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-5 w-9 rounded-full shrink-0 mt-1" />
    </div>
  );
}

function SettingSectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <div className="space-y-8">
        {Array.from({ length: rows }, (_, i) => (
          <SettingRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8 pb-20">
      <SettingSectionSkeleton rows={5} />
      <SettingSectionSkeleton rows={2} />
      <SettingSectionSkeleton rows={3} />
      <SettingSectionSkeleton rows={2} />
    </div>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-[220px]">
      <Input
        type={show ? "text" : "password"}
        placeholder="Enter password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
