import { BaseCodeBlockKit } from "./plugins/code-block-kit";
import {
  BaseBasicBlocksKit,
  BaseCalloutKit,
  BaseColumnKit,
  BaseDateKit,
  BaseTocKit,
  BaseToggleKit,
} from "./plugins/content-blocks-kit";
import {
  BaseAlignKit,
  BaseFontKit,
  BaseLineHeightKit,
} from "./plugins/formatting-kit";
import { BaseCommentKit, BaseSuggestionKit } from "./plugins/collaboration-base-kit";
import { BaseLinkKit, BaseMentionKit } from "./plugins/inline-nodes-kit";
import { BaseListKit } from "./plugins/list-kit";
import { MarkdownKit } from "./plugins/markdown-kit";
import { BaseBasicMarksKit } from "./plugins/marks-kit";
import { BaseMathKit } from "./plugins/math-kit";
import { BaseMediaKit } from "./plugins/media-kit";
import { BaseTableKit } from "./plugins/table-kit";

export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseCodeBlockKit,
  ...BaseTableKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseMediaKit,
  ...BaseCalloutKit,
  ...BaseColumnKit,
  ...BaseMathKit,
  ...BaseDateKit,
  ...BaseLinkKit,
  ...BaseMentionKit,
  ...BaseBasicMarksKit,
  ...BaseFontKit,
  ...BaseListKit,
  ...BaseAlignKit,
  ...BaseLineHeightKit,
  ...BaseCommentKit,
  ...BaseSuggestionKit,
  ...MarkdownKit,
];
