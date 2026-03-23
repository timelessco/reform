import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createFormRouteDetailService } from "@/lib/form-route-detail";

describe("resolveFormRouteTarget", () => {
  it("uses cached form detail to resolve the route without fetching", async () => {
    const getFormByIdQueryOptionsMock = vi.fn((formId: string) => ({
      queryKey: ["forms", formId],
      queryFn: async () => ({
        form: {
          id: formId,
          status: "draft",
        },
      }),
    }));
    const { resolveFormRouteTarget } = createFormRouteDetailService({
      getFormByIdQueryOptions: getFormByIdQueryOptionsMock as never,
    });
    const queryClient = new QueryClient();
    queryClient.setQueryData(["forms", "form-1"], {
      form: {
        id: "form-1",
        status: "published",
      },
    });

    const target = await resolveFormRouteTarget(queryClient, "form-1");

    expect(target).toBe("submissions");
  });

  it("fetches form detail when the query cache is empty", async () => {
    const getFormByIdQueryOptionsMock = vi.fn((formId: string) => ({
      queryKey: ["forms", formId],
      queryFn: async () => ({
        form: {
          id: formId,
          status: "published",
        },
      }),
    }));
    const { resolveFormRouteTarget } = createFormRouteDetailService({
      getFormByIdQueryOptions: getFormByIdQueryOptionsMock as never,
    });
    const queryClient = new QueryClient();

    const target = await resolveFormRouteTarget(queryClient, "form-2");

    expect(target).toBe("submissions");
  });

  it("falls back to the edit route when detail loading fails", async () => {
    const getFormByIdQueryOptionsMock = vi.fn((formId: string) => ({
      queryKey: ["forms", formId],
      queryFn: async () => {
        throw new Error("boom");
      },
    }));
    const { resolveFormRouteTarget } = createFormRouteDetailService({
      getFormByIdQueryOptions: getFormByIdQueryOptionsMock as never,
    });
    const queryClient = new QueryClient();

    const target = await resolveFormRouteTarget(queryClient, "form-3");

    expect(target).toBe("edit");
  });
});
