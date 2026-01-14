# LIB KNOWLEDGE BASE

**Generated:** 2026-01-14
**Scope:** Core utilities, Auth, and Schema generation

## OVERVIEW
Core logic for authentication (Better Auth), dynamic Zod schema generation, and Plate.js data transformations for the local-first form builder.

## WHERE TO LOOK

| Task | File | Role |
|------|------|------|
| Auth Config (Server) | `auth.ts` | Better Auth server instance + Drizzle adapter |
| Auth Config (Client) | `auth-client.ts` | Better Auth client + Query-wrapped `auth` |
| Auth-Query Adapter | `auth-query.ts` | Proxy to bridge Better Auth into TanStack Query |
| Dynamic Schemas | `generate-zod-schema.ts` | Generates Zod objects/strings from form elements |
| Preview Schemas | `generate-preview-schema.ts` | Zod generation for editor preview mode |
| Editor Transform | `transform-plate-to-form.ts` | Plate.js state -> Form component mapping |
| AI Stream Joiner | `markdown-joiner-transform.ts` | Buffers fragmented AI markdown chunks |
| File Uploads | `uploadthing.ts` | UploadThing server router configuration |
| Style Utilities | `utils.ts` | Tailwind merging (`cn`) |

## CONVENTIONS
- **Query-fied Auth**: Prefer `auth` from `@/lib/auth-client` for TanStack Query options/mutations over raw Better Auth hooks.
- **Generation Tiers**: 
    - *Preview*: Uses `generate-preview-schema.ts` for real-time editor validation.
    - *Production*: Uses `generate-zod-schema.ts` for final form logic and code export.
- **Dynamic Validation**: Logic is registered in `FIELD_SCHEMA_MAP` (in `generate-zod-schema.ts`) supporting 15+ field types.
- **Plate Mapping**: Editor nodes must be transformed via `transform-plate-to-form.ts` before rendering.
- **Naming**: Use `sanitizeFieldName` to ensure field names are JS-safe (snake_case).

## ANTI-PATTERNS
- **Type Coercion**: `auth-query.ts` uses `any` extensively for Proxy targeting; exercise caution when extending.
- **Env Vars**: `auth.ts` uses non-null assertions (`as string`) for client IDs; will crash if missing.
- **OTP Logs**: `auth.ts` logs OTPs to console in dev; ensure email service is configured for production.

## KEY FILES
- `auth-query.ts`: Bridges the gap between Better Auth's RPC-style client and TanStack's reactive query system.
- `generate-zod-schema.ts`: Complex mapping logic that converts dynamic form metadata into valid Zod validation code.
- `transform-plate-to-form.ts`: The "glue" that translates rich-text editor blocks into structured form field definitions.
