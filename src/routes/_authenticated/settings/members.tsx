import { createFileRoute, redirect } from "@tanstack/react-router";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";

export const Route = createFileRoute("/_authenticated/settings/members")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      settingsDialogStore.open("members");
    }
    throw redirect({ to: "/dashboard" });
  },
});
