import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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
import { Switch } from "@/components/ui/switch";
import { revalidateLogic, useAppForm } from "@/components/ui/tanstack-form";
import { updateSettings } from "@/db-collections/form.collections";
import { useForm as useLiveForm } from "@/hooks/use-live-hooks";

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

export function SettingsContent({ formId }: { formId: string }) {
  const savedDocs = useLiveForm(formId);
  const doc = savedDocs.data?.[0];

  const form = useAppForm({
    defaultValues: doc?.settings || {},
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      try {
        await updateSettings(formId, value);
        toast.success("Settings saved successfully");
      } catch {
        toast.error("Failed to save settings");
      }
    },
  });

  if (!doc) return null;

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

          {/* Save Button */}
          <div className="pt-4 border-t">
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  onClick={() => form.handleSubmit()}
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              )}
            </form.Subscribe>
          </div>
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
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="space-y-1 max-w-xl">
        <Label className="text-sm font-semibold">{title}</Label>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0 flex items-center pt-1">{children}</div>
    </div>
  );
}
