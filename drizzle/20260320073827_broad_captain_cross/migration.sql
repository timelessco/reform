CREATE INDEX "idx_form_analytics_daily_form_id_date" ON "form_analytics_daily" ("formId","date");--> statement-breakpoint
CREATE INDEX "idx_form_dropoff_daily_form_id_date" ON "form_dropoff_daily" ("formId","date");--> statement-breakpoint
CREATE INDEX "idx_form_favorites_user_id" ON "form_favorites" ("userId");--> statement-breakpoint
CREATE INDEX "idx_form_favorites_user_id_form_id" ON "form_favorites" ("userId","formId");--> statement-breakpoint
CREATE INDEX "idx_form_versions_form_id" ON "form_versions" ("formId");--> statement-breakpoint
CREATE INDEX "idx_form_versions_form_id_version" ON "form_versions" ("formId","version");--> statement-breakpoint
CREATE INDEX "idx_form_visits_form_id" ON "form_visits" ("formId");--> statement-breakpoint
CREATE INDEX "idx_forms_workspace_id" ON "forms" ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_forms_workspace_id_status" ON "forms" ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "idx_forms_id_created_by" ON "forms" ("id","createdByUserId");--> statement-breakpoint
CREATE INDEX "idx_member_user_id_org_id" ON "member" ("userId","organizationId");--> statement-breakpoint
CREATE INDEX "idx_submissions_form_id" ON "submissions" ("formId");--> statement-breakpoint
CREATE INDEX "idx_submissions_form_id_created_at_id" ON "submissions" ("formId","createdAt","id");--> statement-breakpoint
CREATE INDEX "idx_workspaces_organization_id" ON "workspaces" ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_workspaces_id_created_by" ON "workspaces" ("id","createdByUserId");