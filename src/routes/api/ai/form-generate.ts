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

const SYSTEM_PROMPT = `You are a form builder assistant. Given a description of a form, generate the appropriate form fields and configure the form's appearance using the available tools.

Rules:
- Use setFormHeader to set the form's title, icon, and cover color. Always call this when creating a new form.
- Use setFormTheme to customize the form's visual theme with raw CSS color tokens. Call this when the user provides a design reference image or asks for a specific visual style. Generate tokens for BOTH light and dark modes using the "light:token" and "dark:token" prefix format.
- When an image is provided, analyze its colors, mood, and style to extract a cohesive theme.
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
                placeholder: z
                  .string()
                  .optional()
                  .describe("Default value text pre-filled in the field that users can edit"),
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
            setFormHeader: tool({
              description:
                "Set the form's header — title, icon, and cover background color. Call this when creating or updating a form's identity.",
              inputSchema: z.object({
                title: z.string().optional().describe("The form title text"),
                iconKeyword: z
                  .string()
                  .optional()
                  .describe(
                    "A keyword to match an icon (e.g., 'mail', 'heart', 'shield', 'calendar', 'shopping', 'user', 'star')",
                  ),
                coverColor: z
                  .string()
                  .optional()
                  .describe("Hex color for the cover/banner background (e.g., '#1e293b')"),
              }),
            }),
            setFormTheme: tool({
              description:
                "Set the form's visual theme with raw CSS color tokens. Generate tokens for BOTH light and dark modes. Use 'light:tokenName' and 'dark:tokenName' prefixed keys.",
              inputSchema: z.object({
                tokens: z
                  .record(z.string(), z.string())
                  .describe(
                    "Map of CSS token names to hex color values. Required tokens for each mode: background, foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, border, input, ring. Prefix with 'light:' or 'dark:' for mode-specific values (e.g., 'light:primary': '#2563eb', 'dark:primary': '#3b82f6').",
                  ),
                font: z
                  .string()
                  .optional()
                  .describe(
                    "Google Font family name (e.g., 'Inter', 'Poppins', 'Playfair Display')",
                  ),
                radius: z
                  .enum(["0", "0.375rem", "0.625rem", "0.875rem"])
                  .optional()
                  .describe(
                    "Border radius: '0' for none, '0.375rem' for small, '0.625rem' for medium, '0.875rem' for large",
                  ),
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
