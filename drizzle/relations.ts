import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  formFavorites: {
    form: r.one.forms({
      from: r.formFavorites.formId,
      to: r.forms.id,
    }),
  },
  forms: {
    formFavorites: r.many.formFavorites(),
    formNotificationPreferences: r.many.formNotificationPreferences(),
    formSubmissionNotifications: r.many.formSubmissionNotifications(),
  },
  formNotificationPreferences: {
    form: r.one.forms({
      from: r.formNotificationPreferences.formId,
      to: r.forms.id,
    }),
  },
  formSubmissionNotifications: {
    form: r.one.forms({
      from: r.formSubmissionNotifications.formId,
      to: r.forms.id,
    }),
  },
}));
