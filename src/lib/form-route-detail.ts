import type { QueryClient } from "@tanstack/react-query";
import { getFormByIdQueryOptions } from "@/lib/fn/forms";
import type { FormStatus } from "@/lib/fn/forms";

type FormRouteTarget = "edit" | "submissions";

type FormDetailQueryResult = {
  form?: {
    id: string;
    status?: FormStatus;
  };
};

export const getFormRouteTarget = (status?: FormStatus): FormRouteTarget =>
  status === "published" ? "submissions" : "edit";

export const createFormRouteDetailService = (
  deps: {
    getFormByIdQueryOptions: typeof getFormByIdQueryOptions;
  } = { getFormByIdQueryOptions },
) => {
  const getCachedFormDetail = (
    queryClient: QueryClient,
    formId: string,
  ): FormDetailQueryResult["form"] => {
    const cached = queryClient.getQueryData<FormDetailQueryResult>(
      deps.getFormByIdQueryOptions(formId).queryKey,
    );

    return cached?.form;
  };

  const ensureFormDetail = async (queryClient: QueryClient, formId: string) => {
    const cached = getCachedFormDetail(queryClient, formId);

    if (cached) {
      return cached;
    }

    const result = (await queryClient.ensureQueryData({
      ...deps.getFormByIdQueryOptions(formId),
      revalidateIfStale: true,
    })) as FormDetailQueryResult;

    return result.form;
  };

  const resolveFormRouteTarget = async (
    queryClient: QueryClient,
    formId: string,
  ): Promise<FormRouteTarget> => {
    try {
      const form = await ensureFormDetail(queryClient, formId);

      return getFormRouteTarget(form?.status);
    } catch {
      return "edit";
    }
  };

  return {
    getCachedFormDetail,
    ensureFormDetail,
    resolveFormRouteTarget,
  };
};

export const { ensureFormDetail, getCachedFormDetail, resolveFormRouteTarget } =
  createFormRouteDetailService();
