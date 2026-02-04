import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Search,
  FileSpreadsheet,
  BookOpen,
  Database,
  Webhook,
  MessageSquare,
  Gamepad2,
  Zap,
  Cog,
  BarChart3,
  Target,
  GitBranch,
  FileText,
  Cloud,
  Puzzle,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/integrations",
)({
  component: IntegrationsPage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function IntegrationsPage() {
	return <IntegrationsContent />;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isPro?: boolean;
}

const integrations: Integration[] = [
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Send submissions to a sheet",
    icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Send submissions to Notion",
    icon: <BookOpen className="h-5 w-5 text-gray-800" />,
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Send submissions to Airtable",
    icon: <Database className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Send events for new submissions to HTTP endpoints",
    icon: <Webhook className="h-5 w-5 text-orange-500" />,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send Slack messages for new submissions",
    icon: <MessageSquare className="h-5 w-5 text-purple-500" />,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send Discord messages for new submissions",
    icon: <Gamepad2 className="h-5 w-5 text-indigo-500" />,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Send submissions to your favorite tools",
    icon: <Zap className="h-5 w-5 text-orange-400" />,
  },
  {
    id: "make",
    name: "Make",
    description: "Send submissions to your favorite tools",
    icon: <Cog className="h-5 w-5 text-purple-600" />,
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Send submissions to your favorite tools",
    icon: <GitBranch className="h-5 w-5 text-red-500" />,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Analyze traffic sources, visitor behavior and time spent",
    icon: <BarChart3 className="h-5 w-5 text-yellow-500" />,
    isPro: true,
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel",
    description: "Measure and optimize your ad campaigns",
    icon: <Target className="h-5 w-5 text-blue-600" />,
    isPro: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Create issues in Linear for new submissions",
    icon: <GitBranch className="h-5 w-5 text-indigo-600" />,
  },
  {
    id: "coda",
    name: "Coda",
    description: "Send submissions to Coda",
    icon: <FileText className="h-5 w-5 text-orange-600" />,
  },
  {
    id: "pipedream",
    name: "Pipedream",
    description: "Send submissions to your favorite tools",
    icon: <Cloud className="h-5 w-5 text-green-500" />,
  },
  {
    id: "ifttt",
    name: "IFTTT",
    description: "Send submissions to your favorite tools",
    icon: <Puzzle className="h-5 w-5 text-black" />,
  },
];

export function IntegrationsContent() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIntegrations = integrations.filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 px-5">
      <div>
        <h2 className="text-lg font-semibold">Discover integrations</h2>
        <p className="text-sm text-muted-foreground">
          Make Tally even more powerful by using these tools. Check out our{" "}
          <a href="#" className="underline hover:text-foreground">
            roadmap
          </a>{" "}
          for upcoming integrations and to request new ones.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="shrink-0 mt-0.5">{integration.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{integration.name}</h3>
                {integration.isPro && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Pro
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {integration.description}
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-xs text-primary mt-1"
              >
                Connect
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No integrations found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
