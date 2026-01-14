# ORPC Router Knowledge Base

**OVERVIEW**
Type-safe RPC procedure definitions providing a secure bridge between the client-side local-first state and PostgreSQL persistence.

**WHERE TO LOOK**
- `index.ts`: The root router assembly. All sub-routers and procedures must be exported here to be available to the ORPC client.
- `todos.ts`: A reference implementation of procedures showing input validation, state management, and type-safe responses.

**CONVENTIONS**
- **Procedure Definition**: Define procedures using `os.input(Schema).handler()`. This ensures Zod validation runs before the handler execution.
- **Session Context**: The `context` object in handlers contains `userId`, injected by `authMiddleware` in the RPC route handler (`src/routes/api.rpc.$.ts`).
- **Input Validation**: Use Zod 4 for all input schemas. Prefer shared schemas from `src/orpc/schema.ts` when dealing with common entities.
- **Error Handling**: Use ORPC's built-in error types to return meaningful HTTP status codes (e.g., NOT_FOUND, UNAUTHORIZED).
- **Service Delegation**: Handlers should primarily act as controllers. Move complex business logic or Drizzle queries into `src/services/`.

**ANTI-PATTERNS**
- **Implicit Context**: Don't assume `context.userId` exists without checking if the procedure is meant to be authenticated (though currently all are scoped).
- **Direct DB Calls**: Avoid writing raw Drizzle queries inside handlers; use services to maintain a clean separation of concerns.
- **Zod Looseness**: Avoid using `.passthrough()` or `z.any()` in inputs which could allow malicious payload injection.
- **Duplicate Schemas**: Don't redefine Zod schemas that already exist in `src/db/schema.ts` or `src/orpc/schema.ts`.

**KEY PROCEDURES**
- `listTodos`: A query procedure that retrieves the list of todos. In production, this should be filtered by `context.userId`.
- `addTodo`: A mutation procedure that accepts a `name` and persists a new todo.
- **Sync Pattern**: Future form sync procedures should follow the `syncForm` pattern, accepting a full form JSON and updating the `forms` table for the matching `userId`.

**TECHNICAL DEBT / NOTES**
- Currently, `todos.ts` uses an in-memory array for demo purposes. These should be migrated to `src/db/` using Drizzle.
- Ensure all new procedure files are added to the default export in `index.ts`.
