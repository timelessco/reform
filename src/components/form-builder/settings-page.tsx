import { useRef, useState } from "react";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { revalidateLogic, useAppForm, withForm } from "@/components/ui/tanstack-form";
import { getFormListings } from "@/collections";
import { localFormCollection } from "@/collections/local/form";
import { useForm, useLocalForm } from "@/hooks/use-live-hooks";
import { defaultFormSettings } from "@/types/form-settings";
import {
  Bell01Icon,
  CalendarLineIcon,
  ClockLineIcon,
  EditLineIcon,
  EyeIcon,
  HideLineIcon,
  IconGlobe,
  Key02Icon,
  Lightning01Icon,
  Loader2Icon,
  Settings02Icon,
  SmallSelectIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingsDefaults = defaultFormSettings;

type SettingsTab = "general" | "notifications" | "behaviour" | "access";

const TABS: { id: SettingsTab; label: string; Icon: typeof Settings02Icon }[] = [
  { id: "general", label: "General", Icon: Settings02Icon },
  { id: "notifications", label: "Notifications", Icon: Bell01Icon },
  { id: "behaviour", label: "Behaviour", Icon: Lightning01Icon },
  { id: "access", label: "Access", Icon: Key02Icon },
];

const TIMEZONES = [
  "GMT +05:30",
  "GMT +00:00",
  "GMT +01:00",
  "GMT +05:00",
  "GMT +08:00",
  "GMT -05:00",
  "GMT -08:00",
];

// ── Figma cell primitives ────────────────────────────────────────────────────

const SettingRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex w-full items-center gap-5">
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* oxlint-disable-next-line shadcn/no-arbitrary-values -- font-[450] has no value-identical weight step; nearest would shift visuals */}
      <span className="text-base leading-[1.15] font-[450] text-foreground">{label}</span>
      {description && <p className={settingDescriptionCls}>{description}</p>}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

// Figma date/tz/time cell: bg-gray-100, rounded-10, pl-10 pr-8 py-10, 14px/420 opsz-24, 16px trailing icon.
const fieldShellCls =
  "flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted py-2.5 pr-2 pl-2.5";

// Row description: 14px/420/0.28px muted — leading-normal is exactly 1.5; weight/tracking kept exact (no identical steps).
const settingDescriptionCls =
  // oxlint-disable-next-line shadcn/no-arbitrary-values -- font-[420] and tracking-[0.28px] have no value-identical scale steps; nearest would shift visuals
  "text-base leading-normal font-[420] tracking-[0.28px] text-muted-foreground font-opsz-24";

const fieldTextCls =
  // oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals
  "min-w-0 flex-1 bg-transparent text-base leading-[1.15] font-[420] text-foreground font-opsz-24 outline-none";

const DateField = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const valid = date && !isNaN(date.getTime()) ? date : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type="button" className={cn(fieldShellCls, "text-left")}>
            <span className={cn(fieldTextCls, "truncate")}>
              {valid ? format(valid, "d MMM, yyyy") : "Pick a date"}
            </span>
            <CalendarLineIcon className="size-4 shrink-0 text-foreground" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={valid}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

// Design-system Select styled as the gray-100 field shell (matches the sibling date/time cells),
// globe glyph replacing the default chevron — drops the native OS dropdown.
const TimezoneField = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) => (
  <Select value={value ?? TIMEZONES[0]} onValueChange={(v) => onChange(v ?? TIMEZONES[0])}>
    <SelectTrigger
      aria-label="Timezone"
      className={cn(
        fieldShellCls,
        // oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals
        "w-full cursor-pointer border-none text-base leading-[1.15] font-[420] text-foreground font-opsz-24 data-[size=default]:h-auto",
      )}
      icon={<IconGlobe className="size-4 shrink-0 text-foreground" />}
    >
      <SelectValue
        placeholder="Timezone"
        // oxlint-disable-next-line shadcn/no-arbitrary-values -- font-[420] has no value-identical weight step; nearest would shift visuals
        className="font-[420]"
      />
    </SelectTrigger>
    <SelectContent align="start">
      {TIMEZONES.map((tz) => (
        <SelectItem key={tz} value={tz}>
          {tz}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const TimeField = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) => (
  <div className={fieldShellCls}>
    <input
      type="time"
      aria-label="Time"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        fieldTextCls,
        "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
      )}
    />
    <ClockLineIcon className="size-4 shrink-0 text-foreground" />
  </div>
);

// A toggle row that reveals a date / timezone / time triple when enabled.
const ScheduleRow = ({
  label,
  description,
  enabled,
  onToggle,
  date,
  onDateChange,
  timezone,
  onTimezoneChange,
  time,
  onTimeChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  date: string | null;
  onDateChange: (value: string | null) => void;
  timezone: string | null;
  onTimezoneChange: (value: string) => void;
  time: string | null;
  onTimeChange: (value: string | null) => void;
}) => (
  <div className="flex w-full flex-col gap-2">
    <SettingRow label={label} description={description}>
      <Switch aria-label={label} size="lg" checked={enabled} onCheckedChange={onToggle} />
    </SettingRow>
    {enabled && (
      <div className="flex w-full items-start gap-2.5">
        <DateField value={date} onChange={onDateChange} />
        <TimezoneField value={timezone} onChange={onTimezoneChange} />
        <TimeField value={time} onChange={onTimeChange} />
      </div>
    )}
  </div>
);

// ── General tab (pixel-matched to Figma node 26095:20665) ────────────────────

const GeneralTab = withForm({
  defaultValues: settingsDefaults,
  render: function GeneralTabRender({ form }) {
    return (
      <div className="flex flex-col gap-6">
        <SettingRow
          label="Language"
          description="Select the default language for form, labels, and error messages."
        >
          <form.AppField name="language">
            {(field: { state: { value: string }; handleChange: (v: string) => void }) => (
              <Select
                value={field.state.value || "English"}
                onValueChange={(value) => field.handleChange(value ?? "English")}
              >
                {/* oxlint-disable-next-line shadcn/no-arbitrary-values -- py-[5.5px] and font-[450] have no value-identical steps; nearest would shift visuals */}
                <SelectTrigger className="h-[30px] w-auto shrink-0 gap-1.5 rounded-lg border-none bg-muted py-[5.5px] pr-2 pl-2.5 font-case text-sm font-[450] text-foreground data-[size=default]:h-[30px] [&_svg]:size-3 [&_svg]:text-muted-foreground">
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
        </SettingRow>

        <SettingRow
          label="Partial submissions"
          description="Save responses even when a form isn't completed. Notifications and integrations won't trigger."
        >
          <form.AppField name="partialSubmissions">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Partial submissions"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>

        <SettingRow label="Show branding" description="Show 'Made in Reform.' on your form.">
          <form.AppField name="branding">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Show branding"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>

        <form.Subscribe
          selector={(state: { values: typeof settingsDefaults }) => ({
            dataRetention: state.values.dataRetention,
            dataRetentionDate: state.values.dataRetentionDate,
            timezone: state.values.timezone,
            dataRetentionTime: state.values.dataRetentionTime,
          })}
        >
          {(v: {
            dataRetention: boolean;
            dataRetentionDate: string | null;
            timezone: string | null;
            dataRetentionTime: string | null;
          }) => (
            <ScheduleRow
              label="Submission retention"
              description="Automatically delete submissions after a set time. Otherwise, they'll be kept until you delete them."
              enabled={v.dataRetention}
              onToggle={(checked) => form.setFieldValue("dataRetention", checked)}
              date={v.dataRetentionDate}
              onDateChange={(value) => form.setFieldValue("dataRetentionDate", value)}
              timezone={v.timezone}
              onTimezoneChange={(value) => form.setFieldValue("timezone", value)}
              time={v.dataRetentionTime}
              onTimeChange={(value) => form.setFieldValue("dataRetentionTime", value)}
            />
          )}
        </form.Subscribe>

        <div className="flex w-full flex-col gap-2">
          <SettingRow
            label="Submission redirect"
            description="Redirect to custom URL after form submission."
          >
            <form.AppField name="redirectOnCompletion">
              {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
                <Switch
                  aria-label="Submission redirect"
                  size="lg"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              )}
            </form.AppField>
          </SettingRow>
          <form.Subscribe
            selector={(state: { values: typeof settingsDefaults }) =>
              state.values.redirectOnCompletion
            }
          >
            {(redirectOnCompletion: boolean) =>
              redirectOnCompletion ? (
                <form.AppField name="redirectUrl">
                  {(field: {
                    state: { value: string | null };
                    handleChange: (v: string | null) => void;
                  }) => (
                    <div className={cn(fieldShellCls, "w-full p-2.5")}>
                      <input
                        type="url"
                        aria-label="Redirect URL"
                        placeholder="https://example.com"
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value || null)}
                        className={cn(fieldTextCls, "text-foreground")}
                      />
                    </div>
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>
      </div>
    );
  },
});

// ── Notifications tab (Figma node 26095:20969) ───────────────────────────────

// Respondent email template: rounded-10 gray-100 card — subject header (border-b) + body.
const EmailTemplateCard = ({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
}: {
  subject: string | null;
  onSubjectChange: (value: string | null) => void;
  body: string | null;
  onBodyChange: (value: string | null) => void;
}) => {
  const subjectRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full flex-col overflow-clip rounded-xl">
      <div className="flex w-full items-center gap-2.5 overflow-clip border-b border-border bg-muted py-1.25 pr-1.25 pl-2.5">
        {/* oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals */}
        <span className="shrink-0 text-base leading-[1.15] font-[420] text-foreground font-opsz-24">
          Subject:
        </span>
        <input
          ref={subjectRef}
          type="text"
          aria-label="Email subject"
          placeholder="Thanks for your submission"
          value={subject ?? ""}
          onChange={(e) => onSubjectChange(e.target.value || null)}
          // oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals
          className="min-w-0 flex-1 bg-transparent text-base leading-[1.15] font-[420] text-foreground outline-none font-opsz-24"
        />
        <button
          type="button"
          aria-label="Edit subject"
          onClick={() => subjectRef.current?.focus()}
          className="flex shrink-0 items-center justify-center rounded-lg p-1.25 text-foreground hover:bg-accent"
        >
          <EditLineIcon className="size-[18px]" />
        </button>
      </div>
      <textarea
        aria-label="Email body"
        placeholder="Write the email respondents receive after submitting…"
        value={body ?? ""}
        onChange={(e) => onBodyChange(e.target.value || null)}
        // oxlint-disable-next-line shadcn/no-arbitrary-values -- font-[420] has no value-identical weight step; nearest would shift visuals
        className="field-sizing-content max-h-[360px] min-h-[96px] w-full resize-none overflow-y-auto bg-muted px-2.5 pt-3 pb-3.5 text-base leading-normal font-[420] text-foreground outline-none font-opsz-24"
      />
    </div>
  );
};

const NotificationsTab = withForm({
  defaultValues: settingsDefaults,
  render: function NotificationsTabRender({ form }) {
    return (
      <div className="flex flex-col gap-6">
        <SettingRow
          label="Email notifications"
          description="Get an email for new form submissions."
        >
          <form.AppField name="selfEmailNotifications">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Email notifications"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>

        <div className="flex w-full flex-col gap-3">
          <SettingRow
            label="Respondent email notifications"
            description="Email respondents after submission, with an optional PDF attachment."
          >
            <form.AppField name="respondentEmailNotifications">
              {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
                <Switch
                  aria-label="Respondent email notifications"
                  size="lg"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              )}
            </form.AppField>
          </SettingRow>
          <form.Subscribe
            selector={(state: { values: typeof settingsDefaults }) => ({
              on: state.values.respondentEmailNotifications,
              subject: state.values.respondentEmailSubject,
              body: state.values.respondentEmailBody,
            })}
          >
            {(v: { on: boolean; subject: string | null; body: string | null }) =>
              v.on ? (
                <EmailTemplateCard
                  subject={v.subject}
                  onSubjectChange={(val) => form.setFieldValue("respondentEmailSubject", val)}
                  body={v.body}
                  onBodyChange={(val) => form.setFieldValue("respondentEmailBody", val)}
                />
              ) : null
            }
          </form.Subscribe>
        </div>
      </div>
    );
  },
});

// ── Behaviour tab (Figma node 26095:21114) ──────────────────────────────────

const BehaviourTab = withForm({
  defaultValues: settingsDefaults,
  render: function BehaviourTabRender({ form }) {
    return (
      <div className="flex flex-col gap-6">
        <SettingRow
          label="Auto-advance"
          description="Auto-advance on answer. Works with one multiple choice, dropdown, rating, or linear scale question per page."
        >
          <form.AppField name="autoAdvance">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Auto-advance"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>
        <SettingRow
          label="Auto-save progress"
          description="Saves progress in the browser so respondents can continue later."
        >
          <form.AppField name="saveAnswersForLater">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Auto-save progress"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>
      </div>
    );
  },
});

// ── Access tab (Figma node 26095:21831) ─────────────────────────────────────

// White elevated number control with the small-select (up/down) affordance — auto-sizes to digits.
const LimitField = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) => (
  <div className="flex shrink-0 items-center gap-1.5 overflow-clip rounded-lg bg-muted py-1.75 pr-2 pl-2.5">
    <input
      type="number"
      min={1}
      aria-label="Submission limit"
      placeholder="100"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      // oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals
      className="field-sizing-content max-w-[6ch] min-w-[2ch] bg-transparent text-base leading-[1.15] font-[420] text-foreground outline-none font-opsz-24"
    />
    <SmallSelectIcon className="size-4 shrink-0 text-foreground" />
  </div>
);

// gray-100 rounded-10 field. `mask` renders a password input + show/hide eye.
const AccessField = ({
  value,
  onChange,
  placeholder,
  mask,
  ariaLabel,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  mask?: boolean;
  ariaLabel: string;
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex w-full items-center gap-3 rounded-xl bg-muted p-2.5">
      <input
        type={mask && !show ? "password" : "text"}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        // oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] and font-[420] have no value-identical steps; nearest would shift visuals
        className="min-w-0 flex-1 bg-transparent text-base leading-[1.15] font-[420] text-foreground outline-none font-opsz-24"
      />
      {mask && (
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
          className="shrink-0 text-foreground"
        >
          {show ? <EyeIcon className="size-4" /> : <HideLineIcon className="size-4" />}
        </button>
      )}
    </div>
  );
};

const AccessTab = withForm({
  defaultValues: settingsDefaults,
  render: function AccessTabRender({ form }) {
    return (
      <div className="flex flex-col gap-6">
        <SettingRow
          label="Limit submissions"
          description="Set how many submissions you want to receive in total."
        >
          <form.AppField name="maxSubmissions">
            {(field: { state: { value: number | null } }) => (
              <LimitField
                value={field.state.value}
                onChange={(v) => {
                  form.setFieldValue("maxSubmissions", v);
                  form.setFieldValue("limitSubmissions", v != null && v > 0);
                }}
              />
            )}
          </form.AppField>
        </SettingRow>

        <SettingRow
          label="Prevent duplicate entries"
          description="Allow one submission per respondent using email, phone number, or IP address."
        >
          <form.AppField name="preventDuplicateSubmissions">
            {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
              <Switch
                aria-label="Prevent duplicate entries"
                size="lg"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            )}
          </form.AppField>
        </SettingRow>

        <div className="flex w-full flex-col gap-2">
          <SettingRow
            label="Password protection"
            description="Require a password to access the form."
          >
            <form.AppField name="passwordProtect">
              {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
                <Switch
                  aria-label="Password protection"
                  size="lg"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              )}
            </form.AppField>
          </SettingRow>
          <form.Subscribe
            selector={(state: { values: typeof settingsDefaults }) => state.values.passwordProtect}
          >
            {(on: boolean) =>
              on ? (
                <form.AppField name="password">
                  {(field: { state: { value: string | null } }) => (
                    <AccessField
                      ariaLabel="Form password"
                      placeholder="Enter a password"
                      mask
                      value={field.state.value}
                      onChange={(v) => form.setFieldValue("password", v)}
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>

        <form.Subscribe
          selector={(state: { values: typeof settingsDefaults }) => ({
            closeOnDate: state.values.closeOnDate,
            closeDate: state.values.closeDate,
            timezone: state.values.timezone,
            closeTime: state.values.closeTime,
          })}
        >
          {(v: {
            closeOnDate: boolean;
            closeDate: string | null;
            timezone: string | null;
            closeTime: string | null;
          }) => (
            <ScheduleRow
              label="Schedule form closure"
              description="Schedule a date on which the form will be closed for new submissions."
              enabled={v.closeOnDate}
              onToggle={(checked) => form.setFieldValue("closeOnDate", checked)}
              date={v.closeDate}
              onDateChange={(value) => form.setFieldValue("closeDate", value)}
              timezone={v.timezone}
              onTimezoneChange={(value) => form.setFieldValue("timezone", value)}
              time={v.closeTime}
              onTimeChange={(value) => form.setFieldValue("closeTime", value)}
            />
          )}
        </form.Subscribe>

        <div className="flex w-full flex-col gap-2">
          <SettingRow
            label="Closed form message"
            description="This is what respondents will see when the form is closed."
          >
            <form.AppField name="customClosedMessage">
              {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
                <Switch
                  aria-label="Closed form message"
                  size="lg"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              )}
            </form.AppField>
          </SettingRow>
          <form.Subscribe
            selector={(state: { values: typeof settingsDefaults }) =>
              state.values.customClosedMessage
            }
          >
            {(on: boolean) =>
              on ? (
                <form.AppField name="closedFormMessage">
                  {(field: { state: { value: string | null } }) => (
                    <AccessField
                      ariaLabel="Closed form message"
                      placeholder="This form is now closed."
                      value={field.state.value}
                      onChange={(v) => form.setFieldValue("closedFormMessage", v)}
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>

        <SettingRow
          label="Close form"
          description="This form will no longer accept new submissions."
        >
          <form.Subscribe
            selector={(state: { values: typeof settingsDefaults }) => state.values.closeForm}
          >
            {(closeForm: boolean) => (
              <button
                type="button"
                onClick={() => form.setFieldValue("closeForm", !closeForm)}
                // oxlint-disable-next-line shadcn/no-arbitrary-values -- bespoke danger tint (#fbeded/#eb4d52), tracking-[0.14px], leading-[1.15] and 3px ring have no identical tokens; swaps would shift visuals
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#fbeded] px-2 py-1.5 font-case text-base leading-[1.15] font-medium tracking-[0.14px] whitespace-nowrap text-[#eb4d52] outline-none focus-visible:ring-[3px] focus-visible:ring-[#eb4d52]/30"
              >
                {closeForm ? "Reopen Form" : "Close Form"}
              </button>
            )}
          </form.Subscribe>
        </SettingRow>
      </div>
    );
  },
});

// ── Page shell ───────────────────────────────────────────────────────────────

// [font-variation-settings:normal] un-pins the global opsz/wght so font-weight + per-cell opsz apply.
const settingsShellCls =
  // oxlint-disable-next-line shadcn/no-arbitrary-values -- [font-variation-settings:normal] has no utility equivalent; keep exact
  "mx-auto flex w-[700px] max-w-full flex-col pt-8 pb-16 [font-variation-settings:normal]";

export const SettingsPage = ({ formId, isLocal }: { formId: string; isLocal?: boolean }) => {
  const cloudForm = useForm(isLocal ? undefined : formId);
  const localFormResult = useLocalForm(isLocal ? formId : undefined);
  const formResult = isLocal ? localFormResult : cloudForm;

  if (formResult.data === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2Icon aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SettingsPageInner formId={formId} isLocal={isLocal} />;
};

const SettingsPageInner = ({ formId, isLocal }: { formId: string; isLocal?: boolean }) => {
  const cloudForm = useForm(isLocal ? undefined : formId);
  const localFormResult = useLocalForm(isLocal ? formId : undefined);
  const formResult = isLocal ? localFormResult : cloudForm;
  const formDoc = formResult.data?.[0] ?? null;
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const collection = (isLocal ? localFormCollection : getFormListings()) as ReturnType<
    typeof getFormListings
  >;

  const form = useAppForm({
    defaultValues: { ...settingsDefaults, ...formDoc?.draftSettings },
    validationLogic: revalidateLogic(),
    listeners: {
      onChange: ({ formApi }) => {
        if (!formDoc?.id) return;
        collection.update(formDoc.id, (draft) => {
          draft.draftSettings = {
            ...(draft.draftSettings ?? settingsDefaults),
            ...formApi.state.values,
          };
          draft.updatedAt = new Date().toISOString();
        });
      },
      onChangeDebounceMs: 500,
    },
  });

  return (
    <div className={settingsShellCls}>
      {/* oxlint-disable-next-line shadcn/no-arbitrary-values -- leading-[1.15] has no value-identical step; nearest leading-tight (1.25) would shift visuals */}
      <h1 className="font-case text-xl leading-[1.15] font-semibold text-foreground">Settings</h1>

      {/* line-variant Tabs: Base UI slides the underline between tabs (mount placed instantly). */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
        className="mt-6"
      >
        <TabsList
          variant="line"
          size="default"
          // `!` beats the line-variant's default border-border-soft (= #afafaf in dark, too bright);
          // Figma's tab rail is gray-200 (#ededed light / #292929 dark) in both modes.
          // p-0! drops the variant's p-px so the rail is 33px (32px pill + 1px border), not 35px.
          className="h-auto! w-full justify-start gap-6 border-border! p-0!"
        >
          {TABS.map(({ id, label, Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              // oxlint-disable-next-line shadcn/no-arbitrary-values -- font-[420] and tracking-[0.28px] have no value-identical steps; nearest would shift visuals
              className="h-8! flex-none gap-2 px-0! font-[420]! tracking-[0.28px] text-muted-foreground font-opsz-24 hover:text-foreground data-active:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
          <TabsIndicator className="bg-foreground!" />
        </TabsList>
      </Tabs>

      <div className="mt-7">
        {/* oxlint-disable-next-line shadcn/no-arbitrary-values -- text-[15px]/leading-[1.15]/tracking-[0.225px] have no value-identical steps (nearest text-base 14px / text-lg 16px); swaps would shift visuals */}
        <h2 className="text-[15px] leading-[1.15] font-semibold tracking-[0.225px] text-foreground font-opsz-24">
          {TABS.find((t) => t.id === activeTab)?.label}
        </h2>
        <div className="mt-6">
          <form.AppForm>
            {activeTab === "general" && <GeneralTab form={form} />}
            {activeTab === "notifications" && <NotificationsTab form={form} />}
            {activeTab === "behaviour" && <BehaviourTab form={form} />}
            {activeTab === "access" && <AccessTab form={form} />}
          </form.AppForm>
        </div>
      </div>
    </div>
  );
};
