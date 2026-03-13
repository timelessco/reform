import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Agentation } from "agentation";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { TailwindIndicator } from "./ui/tailwind-indicator";

export function Devtools() {
  return (
    <>
      <TanStackDevtools
        aria-label="TanStack Devtools"
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel aria-label="Tanstack Router Devtools" />,
          },
          TanStackQueryDevtools,
          hotkeysDevtoolsPlugin(),
        ]}
      />
      <Agentation aria-label="Agentation" />
      {/* <TailwindIndicator key="tailwind-indicator" /> */}
    </>
  );
}
