import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Agentation } from "agentation";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

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
        ]}
      />
      <Agentation aria-label="Agentation" />
    </>
  );
}
