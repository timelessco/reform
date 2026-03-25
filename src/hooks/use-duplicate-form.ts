import { duplicateForm as duplicateFormServer } from "@/lib/fn/forms";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

export const useDuplicateForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const duplicateForm = useCallback(
    async (formId: string) => {
      const result = await duplicateFormServer({ data: { id: formId } });
      queryClient.setQueryData(["forms", result.form.id], { form: result.form });
      await queryClient.invalidateQueries({ queryKey: ["form-listings"] });
      toast.success("Form duplicated");
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: result.form.workspaceId, formId: result.form.id },
      });
      return result.form;
    },
    [navigate, queryClient],
  );

  return duplicateForm;
};
