import { TrailingBlockPlugin } from "platejs";

import { AutoformatKit } from "@/components/editor/plugins/autoformat-kit";
import { BlockMenuKit } from "@/components/editor/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@/components/editor/plugins/block-placeholder-kit";
import { CodeBlockKit } from "@/components/editor/plugins/code-block-kit";
import { CommentKit } from "@/components/editor/plugins/comment-kit";
import {
  BasicBlocksKit,
  CalloutKit,
  ColumnKit,
  DateKit,
  TocKit,
  ToggleKit,
} from "@/components/editor/plugins/content-blocks-kit";
import { CursorOverlayKit } from "@/components/editor/plugins/cursor-overlay-kit";
import { DiscussionKit } from "@/components/editor/plugins/discussion-kit";
import { DndKit } from "@/components/editor/plugins/dnd-kit";
import { EmojiKit } from "@/components/editor/plugins/emoji-kit";
import { ExitBreakKit } from "@/components/editor/plugins/exit-break-kit";
import { FloatingToolbarKit } from "@/components/editor/plugins/floating-toolbar-kit";
import {
  AlignKit,
  FontKit,
  LineHeightKit,
} from "@/components/editor/plugins/formatting-kit";
import { FormBlocksKit } from "@/components/editor/plugins/form-blocks-kit";
import { FormHeaderKit } from "@/components/editor/plugins/form-header-kit";
import { LinkKit, MentionKit } from "@/components/editor/plugins/inline-nodes-kit";
import { ListKit } from "@/components/editor/plugins/list-kit";
import { MarkdownKit } from "@/components/editor/plugins/markdown-kit";
import { BasicMarksKit } from "@/components/editor/plugins/marks-kit";
import { MathKit } from "@/components/editor/plugins/math-kit";
import { MediaKit } from "@/components/editor/plugins/media-kit";
import { OnboardingKit } from "@/components/editor/plugins/onboarding-kit";
import { SlashKit } from "@/components/editor/plugins/slash-kit";
import { SuggestionKit } from "@/components/editor/plugins/suggestion-kit";
import { TableKit } from "@/components/editor/plugins/table-kit";

export const EditorKit = [
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
];
