import { BaseLinkPlugin } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { BaseMentionPlugin } from "@platejs/mention";
import { MentionInputPlugin, MentionPlugin } from "@platejs/mention/react";

import { LinkElement } from "@/components/ui/link-node";
import { LinkElementStatic } from "@/components/ui/link-node-static";
import { LinkFloatingToolbar } from "@/components/ui/link-toolbar";
import { MentionElement, MentionInputElement } from "@/components/ui/mention-node";
import { MentionElementStatic } from "@/components/ui/mention-node-static";

// ── Interactive plugins ──────────────────────────────────────────────

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];

export const MentionKit = [
  MentionPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^$|^[\s"']$/,
    },
  }).withComponent(MentionElement),
  MentionInputPlugin.withComponent(MentionInputElement),
];

// ── Static/SSR plugins ───────────────────────────────────────────────

export const BaseLinkKit = [BaseLinkPlugin.withComponent(LinkElementStatic)];

export const BaseMentionKit = [BaseMentionPlugin.withComponent(MentionElementStatic)];
