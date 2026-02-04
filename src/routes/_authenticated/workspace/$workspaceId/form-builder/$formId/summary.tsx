import { createFileRoute } from '@tanstack/react-router'
import { InsightsContent } from './insights'

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/summary",
)({
  component: SummaryPage,
});

function SummaryPage() {
  return (
    <div className="relative pt-2">
      <InsightsContent />
    </div>
  );
}
