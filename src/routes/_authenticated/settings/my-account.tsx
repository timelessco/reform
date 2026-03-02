import { createFileRoute, redirect } from "@tanstack/react-router";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";

export const Route = createFileRoute("/_authenticated/settings/my-account")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      settingsDialogStore.open("account");
    }
    throw redirect({ to: "/dashboard" });
  },
});
