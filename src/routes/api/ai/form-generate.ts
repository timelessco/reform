import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool } from "ai";
import type { UIMessage } from "ai";
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

  // Default: OpenAI (also works with OpenAI-compatible APIs via AI_BASE_URL)
  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return openai(modelId);
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
          messages?: UIMessage[];
          editorContent?: string;
        };

        const messages = body.messages;
        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const model = await getModel();

        // Prepend editor context to the system prompt if available
        const systemWithContext = body.editorContent
          ? `${SYSTEM_PROMPT}\n\nCurrent form content:\n${body.editorContent}`
          : SYSTEM_PROMPT;

        // Convert UIMessages (from useChat) to CoreMessages (for streamText)
        const modelMessages = convertToModelMessages(messages);

        const result = streamText({
          model,
          system: systemWithContext,
          messages: modelMessages,
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
                  .enum(["1", "2", "3"])
                  .optional()
                  .describe("Heading level: '1' for h1, '2' for h2, '3' for h3. Default '2'."),
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
