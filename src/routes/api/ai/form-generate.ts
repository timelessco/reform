import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, generateText, streamObject, tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { apiAuthMiddleware } from "@/lib/auth/middleware";
import { formGenSchema, RADIUS_OPTIONS, themeTokensSchema } from "@/lib/ai/ops-schema";
import {
  FORM_APPEND_SYSTEM_PROMPT,
  FORM_EDIT_SYSTEM_PROMPT,
  FORM_GEN_SYSTEM_PROMPT,
  FORM_THEME_SYSTEM_PROMPT,
} from "@/lib/ai/system-prompts";

const getModel = async () => {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const apiKey = process.env.AI_API_KEY ?? "";
  const modelId = process.env.AI_MODEL ?? "gpt-4o-mini";
  const baseURL = process.env.AI_BASE_URL;

  if (provider === "google") {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelId);
  }

  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return openai(modelId);
};

export const Route = createFileRoute("/api/ai/form-generate")({
  server: {
    middleware: [apiAuthMiddleware],
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          editorContent?: string;
          selectionContext?: string;
          mode?: "create" | "append" | "replace" | "theme";
        };

        const messages = body.messages;
        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const model = await getModel();

        const mode = body.mode ?? "create";
        const basePrompt =
          mode === "theme"
            ? FORM_THEME_SYSTEM_PROMPT
            : mode === "replace"
              ? FORM_EDIT_SYSTEM_PROMPT
              : mode === "append"
                ? FORM_APPEND_SYSTEM_PROMPT
                : FORM_GEN_SYSTEM_PROMPT;

        const contextParts: string[] = [];
        if (body.editorContent) {
          contextParts.push(`Current form content:\n${body.editorContent}`);
        }
        if (body.selectionContext) {
          if (mode === "replace") {
            contextParts.push(
              `The user selected these blocks and asked for an edit — emit replacement ops for ONLY these:\n"""\n${body.selectionContext}\n"""`,
            );
          } else if (mode === "append") {
            contextParts.push(
              `The user has selected these blocks for context — they want to ADD new content (do NOT remove or regenerate the selection):\n"""\n${body.selectionContext}\n"""`,
            );
          } else {
            contextParts.push(
              `The user has selected the following block as context for their request:\n"""\n${body.selectionContext}\n"""`,
            );
          }
        }
        const systemWithContext = contextParts.length
          ? `${basePrompt}\n\n${contextParts.join("\n\n")}`
          : basePrompt;

        const modelMessages = await Promise.resolve(convertToModelMessages(messages));

        // ── Theme mode: tool-call (one-shot, non-streaming) ─────────────────
        // Theme is atomic — no benefit to streaming, and tool-call gives the
        // model a clear contract (call setFormTheme exactly once with full args).
        if (mode === "theme") {
          const setFormThemeArgs = z.object({
            tokens: themeTokensSchema,
            font: z.string(),
            radius: z.enum(RADIUS_OPTIONS),
          });

          let captured: z.infer<typeof setFormThemeArgs> | null = null;

          await generateText({
            model,
            system: systemWithContext,
            messages: modelMessages,
            toolChoice: "required",
            tools: {
              setFormTheme: tool({
                description:
                  "Apply a complete visual theme to the form (colors, font, radius). Call exactly once with all 30 token values, font, and radius.",
                inputSchema: setFormThemeArgs,
                execute: async (args) => {
                  captured = args;
                  return { ok: true };
                },
              }),
            },
          });

          if (!captured) {
            return new Response(JSON.stringify({ error: "model_did_not_emit_theme" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ theme: captured }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── All other modes: structured-output streaming ────────────────────
        const result = streamObject({
          model,
          schema: formGenSchema,
          system: systemWithContext,
          messages: modelMessages,
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
