import { BaseCommentPlugin } from "@platejs/comment";
import { BaseSuggestionPlugin } from "@platejs/suggestion";

import { CommentLeafStatic } from "@/components/ui/comment-node-static";
import { SuggestionLeafStatic } from "@/components/ui/suggestion-node-static";

export const BaseCommentKit = [BaseCommentPlugin.withComponent(CommentLeafStatic)];

export const BaseSuggestionKit = [BaseSuggestionPlugin.withComponent(SuggestionLeafStatic)];
