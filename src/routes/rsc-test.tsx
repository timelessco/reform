import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { CompositeComponent, createCompositeComponent } from "@tanstack/react-start/rsc";
import { useState } from "react";

const getRscShell = createServerFn({ method: "GET" }).handler(async () => {
  const serverTimestamp = Date.now();
  const serverIsoTimestamp = new Date(serverTimestamp).toISOString();

  const src = await createCompositeComponent(
    ({ Counter }: { Counter: React.ComponentType<{ label: string }> }) => (
      // oxlint-disable-next-line shadcn/no-arbitrary-values -- test-only green streaming indicator (#16a34a) and system font stack have no identical theme tokens; keep exact
      <section className="m-4 rounded-lg border-2 border-dashed border-[#16a34a] p-4 [font-family:ui-sans-serif,system-ui]">
        <h1 className="m-0">RSC plumbing test</h1>
        <p>
          This heading and paragraph were rendered on the <strong>server</strong> at{" "}
          <code>{serverIsoTimestamp}</code>.
        </p>
        <p>
          Below this line is a <em>client</em> slot passed as a component prop. If it ticks, slots
          work. If the border is green, streaming works.
        </p>
        <Counter label="Server-provided label" />
      </section>
    ),
  );

  return { src };
});

const RouteComponent = () => {
  const { src } = Route.useLoaderData();

  return <CompositeComponent src={src} Counter={ClientCounter} />;
};

const ClientCounter = ({ label }: { label: string }) => {
  const [count, setCount] = useState(0);

  return (
    <div
      // oxlint-disable-next-line shadcn/no-arbitrary-values -- test-only blue slot indicator (#2563eb) has no identical theme token; keep exact
      className="mt-3 rounded-md border border-[#2563eb] p-3"
    >
      <strong>Client slot:</strong> {label}
      <div className="mt-2">
        <button onClick={() => setCount((c) => c + 1)} className="px-2.5 py-1" type="button">
          clicks: {count}
        </button>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/rsc-test")({
  loader: () => getRscShell(),
  component: RouteComponent,
});
