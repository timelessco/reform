-- Switch all timestamp columns from TIMESTAMP to TIMESTAMPTZ
-- Existing values are treated as UTC (Supabase default timezone)

-- organization
ALTER TABLE "organization" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- member
ALTER TABLE "member" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- invitation
ALTER TABLE "invitation" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "invitation" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- todos
ALTER TABLE "todos" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- user
ALTER TABLE "user" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "user" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- session
ALTER TABLE "session" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "session" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "session" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- account
ALTER TABLE "account" ALTER COLUMN "accessTokenExpiresAt" TYPE timestamptz USING "accessTokenExpiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "account" ALTER COLUMN "refreshTokenExpiresAt" TYPE timestamptz USING "refreshTokenExpiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "account" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "account" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- verification
ALTER TABLE "verification" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "verification" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "verification" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- apikey
ALTER TABLE "apikey" ALTER COLUMN "lastRefillAt" TYPE timestamptz USING "lastRefillAt" AT TIME ZONE 'UTC';
ALTER TABLE "apikey" ALTER COLUMN "lastRequest" TYPE timestamptz USING "lastRequest" AT TIME ZONE 'UTC';
ALTER TABLE "apikey" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "apikey" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "apikey" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- workspaces
ALTER TABLE "workspaces" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "workspaces" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- forms
ALTER TABLE "forms" ALTER COLUMN "deletedAt" TYPE timestamptz USING "deletedAt" AT TIME ZONE 'UTC';
ALTER TABLE "forms" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "forms" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_versions
ALTER TABLE "form_versions" ALTER COLUMN "publishedAt" TYPE timestamptz USING "publishedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_versions" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- submissions
ALTER TABLE "submissions" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "submissions" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_favorites
ALTER TABLE "form_favorites" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- form_settings
ALTER TABLE "form_settings" ALTER COLUMN "closeDate" TYPE timestamptz USING "closeDate" AT TIME ZONE 'UTC';
ALTER TABLE "form_settings" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_settings" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_share_settings
ALTER TABLE "form_share_settings" ALTER COLUMN "expiresAt" TYPE timestamptz USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_share_settings" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_share_settings" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_visits
ALTER TABLE "form_visits" ALTER COLUMN "visitStartedAt" TYPE timestamptz USING "visitStartedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_visits" ALTER COLUMN "visitEndedAt" TYPE timestamptz USING "visitEndedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_visits" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_visits" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_question_progress
ALTER TABLE "form_question_progress" ALTER COLUMN "viewedAt" TYPE timestamptz USING "viewedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_question_progress" ALTER COLUMN "startedAt" TYPE timestamptz USING "startedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_question_progress" ALTER COLUMN "completedAt" TYPE timestamptz USING "completedAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_question_progress" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- form_analytics_daily
ALTER TABLE "form_analytics_daily" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_analytics_daily" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

-- form_dropoff_daily
ALTER TABLE "form_dropoff_daily" ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "form_dropoff_daily" ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
