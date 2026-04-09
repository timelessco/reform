import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { forms } from "@/db/schema";
import { db } from "@/db";
import { FORM_ID_RE, publicCorsHeaders } from "@/lib/config/embed-cors";

const CACHE_CONTROL = "public, max-age=60";

export const Route = createFileRoute("/api/forms/$formId/meta")({
  server: {
    handlers: {
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: { ...publicCorsHeaders, "Cache-Control": CACHE_CONTROL },
        }),
      GET: async ({ params }: { params: { formId: string } }) => {
        const headers = {
          ...publicCorsHeaders,
          "Cache-Control": CACHE_CONTROL,
          "Content-Type": "application/json",
        };
        if (!FORM_ID_RE.test(params.formId)) {
          return new Response(JSON.stringify({ error: "invalid_form_id" }), {
            status: 400,
            headers,
          });
        }

        const [form] = await db
          .select({
            id: forms.id,
            title: forms.title,
            icon: forms.icon,
            cover: forms.cover,
          })
          .from(forms)
          .where(and(eq(forms.id, params.formId), eq(forms.status, "published")));

        if (!form) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers,
          });
        }

        return new Response(JSON.stringify(form), { status: 200, headers });
      },
    },
  },
});
