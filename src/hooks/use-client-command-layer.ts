import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClientCommandLayer } from "@/lib/client-command-layer";

export const useClientCommandLayer = (activeOrgId?: string) => {
  const queryClient = useQueryClient();

  return useMemo(
    () =>
      createClientCommandLayer({
        activeOrgId,
        queryClient,
      }),
    [activeOrgId, queryClient],
  );
};
