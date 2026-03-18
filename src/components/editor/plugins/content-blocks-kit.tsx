import {
  BaseBlockquotePlugin,
  BaseCalloutPlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
  BaseHorizontalRulePlugin,
} from "@platejs/basic-nodes";
import {
  BlockquotePlugin,
  CalloutPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { BaseDatePlugin } from "@platejs/date";
import { DatePlugin } from "@platejs/date/react";
import { BaseColumnItemPlugin, BaseColumnPlugin } from "@platejs/layout";
import { ColumnItemPlugin, ColumnPlugin } from "@platejs/layout/react";
import { BaseTocPlugin } from "@platejs/toc";
import { TocPlugin } from "@platejs/toc/react";
import { BaseTogglePlugin } from "@platejs/toggle";
import { TogglePlugin } from "@platejs/toggle/react";
import { BaseParagraphPlugin } from "platejs";
import { ParagraphPlugin } from "platejs/react";

import { BlockquoteElement } from "@/components/ui/blockquote-node";
import { BlockquoteElementStatic } from "@/components/ui/blockquote-node-static";
import { CalloutElement } from "@/components/ui/callout-node";
import { CalloutElementStatic } from "@/components/ui/callout-node-static";
import { ColumnElement, ColumnGroupElement } from "@/components/ui/column-node";
import { ColumnElementStatic, ColumnGroupElementStatic } from "@/components/ui/column-node-static";
import { DateElement } from "@/components/ui/date-node";
import { DateElementStatic } from "@/components/ui/date-node-static";
import {
  H1Element,
  H2Element,
  H3Element,
  H4Element,
  H5Element,
  H6Element,
} from "@/components/ui/heading-node";
import {
  H1ElementStatic,
  H2ElementStatic,
  H3ElementStatic,
  H4ElementStatic,
  H5ElementStatic,
  H6ElementStatic,
} from "@/components/ui/heading-node-static";
import { HrElement } from "@/components/ui/hr-node";
import { HrElementStatic } from "@/components/ui/hr-node-static";
import { ParagraphElement } from "@/components/ui/paragraph-node";
import { ParagraphElementStatic } from "@/components/ui/paragraph-node-static";
import { TocElement } from "@/components/ui/toc-node";
import { TocElementStatic } from "@/components/ui/toc-node-static";
import { ToggleElement } from "@/components/ui/toggle-node";
import { ToggleElementStatic } from "@/components/ui/toggle-node-static";

import { IndentKit } from "./formatting-kit";

// ── Interactive plugins ──────────────────────────────────────────────

export const BasicBlocksKit = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.configure({
    node: {
      component: H1Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+1" } },
  }),
  H2Plugin.configure({
    node: {
      component: H2Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+2" } },
  }),
  H3Plugin.configure({
    node: {
      component: H3Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+3" } },
  }),
  H4Plugin.configure({
    node: {
      component: H4Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+4" } },
  }),
  H5Plugin.configure({
    node: {
      component: H5Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+5" } },
  }),
  H6Plugin.configure({
    node: {
      component: H6Element,
    },
    rules: {
      break: { empty: "reset" },
    },
    shortcuts: { toggle: { keys: "mod+alt+6" } },
  }),
  BlockquotePlugin.configure({
    node: { component: BlockquoteElement },
    shortcuts: { toggle: { keys: "mod+shift+period" } },
  }),
  HorizontalRulePlugin.withComponent(HrElement),
];

export const CalloutKit = [CalloutPlugin.withComponent(CalloutElement)];

export const ColumnKit = [
  ColumnPlugin.withComponent(ColumnGroupElement),
  ColumnItemPlugin.withComponent(ColumnElement),
];

export const DateKit = [DatePlugin.withComponent(DateElement)];

export const TocKit = [
  TocPlugin.configure({
    options: {
      // isScroll: true,
      topOffset: 80,
    },
  }).withComponent(TocElement),
];

export const ToggleKit = [...IndentKit, TogglePlugin.withComponent(ToggleElement)];

// ── Static/SSR plugins ───────────────────────────────────────────────

export const BaseBasicBlocksKit = [
  BaseParagraphPlugin.withComponent(ParagraphElementStatic),
  BaseH1Plugin.withComponent(H1ElementStatic),
  BaseH2Plugin.withComponent(H2ElementStatic),
  BaseH3Plugin.withComponent(H3ElementStatic),
  BaseH4Plugin.withComponent(H4ElementStatic),
  BaseH5Plugin.withComponent(H5ElementStatic),
  BaseH6Plugin.withComponent(H6ElementStatic),
  BaseBlockquotePlugin.withComponent(BlockquoteElementStatic),
  BaseHorizontalRulePlugin.withComponent(HrElementStatic),
];

export const BaseCalloutKit = [BaseCalloutPlugin.withComponent(CalloutElementStatic)];

export const BaseColumnKit = [
  BaseColumnPlugin.withComponent(ColumnGroupElementStatic),
  BaseColumnItemPlugin.withComponent(ColumnElementStatic),
];

export const BaseDateKit = [BaseDatePlugin.withComponent(DateElementStatic)];

export const BaseTocKit = [BaseTocPlugin.withComponent(TocElementStatic)];

export const BaseToggleKit = [BaseTogglePlugin.withComponent(ToggleElementStatic)];
