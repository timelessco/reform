import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { streamText, tool } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";

const FIELD_TYPES = [
  "input",
  "textarea",
  "email",
  "phone",
  "number",
  "link",
  "date",
  "time",
  "fileUpload",
  "checkbox",
  "multiChoice",
  "multiSelect",
  "ranking",
] as const;

const SYSTEM_PROMPT = `You are a form builder assistant. Given a description of a form, generate the appropriate form fields using the available tools.

Rules:
- Use addFormSection to create logical groupings with headings when the form has multiple distinct sections.
- Use addFormBlock to create individual form fields.
- Choose the most appropriate fieldType for each field.
- Set required to true for fields that are typically mandatory (e.g. name, email).
- Provide helpful placeholder text where appropriate.
- For multiChoice, multiSelect, and ranking fields, always provide an options array.
- Generate fields in a logical order that makes sense for the form's purpose.`;

const createProvider = () => {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const apiKey = process.env.AI_API_KEY ?? "";
  const baseURL = process.env.AI_BASE_URL;

  return createOpenAI({
    name: provider,
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
};

export const Route = createFileRoute("/api/ai/form-generate")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = (await request.json()) as {
          messages?: Array<{ role: string; content: string }>;
          editorContent?: string;
        };

        const messages = body.messages;
        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const provider = createProvider();
        const modelId = process.env.AI_MODEL ?? "gpt-4o-mini";

        // Prepend editor context to the system prompt if available
        const systemWithContext = body.editorContent
          ? `${SYSTEM_PROMPT}\n\nCurrent form content:\n${body.editorContent}`
          : SYSTEM_PROMPT;

        const result = streamText({
          model: provider(modelId),
          system: systemWithContext,
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          toolChoice: "required",
          tools: {
            addFormBlock: tool({
              description: "Add a form field block with the specified type and label",
              inputSchema: z.object({
                fieldType: z.enum(FIELD_TYPES),
                label: z.string().describe("The label text for the field"),
                required: z.boolean().optional().describe("Whether the field is required"),
                placeholder: z.string().optional().describe("Placeholder text for the field"),
                options: z
                  .array(z.string())
                  .optional()
                  .describe("Options for multiChoice, multiSelect, and ranking fields"),
              }),
            }),
            addFormSection: tool({
              description: "Add a section heading to organize form fields",
              inputSchema: z.object({
                title: z.string().describe("The section heading text"),
                level: z
                  .union([z.literal(1), z.literal(2), z.literal(3)])
                  .optional()
                  .describe("Heading level (1, 2, or 3)"),
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
