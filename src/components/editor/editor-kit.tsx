import { NodeIdPlugin, TrailingBlockPlugin } from "platejs";

import { AlignKit } from "@/components/editor/plugins/align-kit";
import { AutoformatKit } from "@/components/editor/plugins/autoformat-kit";
import { BasicBlocksKit } from "@/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit";
import { BlockMenuKit } from "@/components/editor/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@/components/editor/plugins/block-placeholder-kit";
import { CalloutKit } from "@/components/editor/plugins/callout-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { ColumnKit } from "@/components/editor/plugins/column-kit";
import { CommentKit } from "@/components/editor/plugins/comment-kit";
import { CursorOverlayKit } from "@/components/editor/plugins/cursor-overlay-kit";
import { DateKit } from "@/components/editor/plugins/date-kit";
import { DiscussionKit } from "@/components/editor/plugins/discussion-kit";
import { DndKit } from "@/components/editor/plugins/dnd-kit";
import { EmojiKit } from "@/components/editor/plugins/emoji-kit";
import { ExitBreakKit } from "@/components/editor/plugins/exit-break-kit";
import { AIDiffKit } from "@/components/editor/plugins/ai-diff-kit";
import { AIInputKit } from "@/components/editor/plugins/ai-input-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plugins/font-kit";
import { FormBlocksKit, TabGuardPlugin } from "@/components/editor/plugins/form-blocks-kit";
import { FormHeaderKit } from "@/components/editor/plugins/form-header-kit";
import { LineHeightKit } from "@/components/editor/plugins/line-height-kit";
import { LinkKit } from "@/components/editor/plugins/link-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MarkdownKit } from "@/components/editor/plugins/markdown-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { MediaKit } from "@/components/editor/plugins/media-kit";
import { MentionKit } from "@/components/editor/plugins/mention-kit";
import { OnboardingKit } from "@/components/editor/plugins/onboarding-kit";
import { SlashKit } from "@/components/editor/plugins/slash-kit";
import { SuggestionKit } from "@/components/editor/plugins/suggestion-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";
import { TocKit } from "@/components/editor/plugins/toc-kit";
import { ToggleKit } from "@/components/editor/plugins/toggle-kit";

export const EditorKit = [
  // Block-selection gates on element.id — without this, legacy docs fail to drag-select.
  NodeIdPlugin.configure({ options: { normalizeInitialValue: true } }),
  ...FormHeaderKit,
  ...OnboardingKit,
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...FormBlocksKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Tab guard must come after IndentPlugin (ListKit/ToggleKit) to wrap outermost
  TabGuardPlugin,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  // ...FixedToolbarKit,
  ...FloatingToolbarKit,

  // AI
  ...AIInputKit,
  ...AIDiffKit,
];
