import {
  BaseFontBackgroundColorPlugin,
  BaseFontColorPlugin,
  BaseFontFamilyPlugin,
  BaseFontSizePlugin,
  BaseLineHeightPlugin,
  BaseTextAlignPlugin,
} from "@platejs/basic-styles";
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import { BaseIndentPlugin } from "@platejs/indent";
import { IndentPlugin } from "@platejs/indent/react";
import type { SlatePluginConfig } from "platejs";
import { KEYS } from "platejs";
import type { PlatePluginConfig } from "platejs/react";

// ── Interactive plugins ──────────────────────────────────────────────

export const IndentKit = [
  IndentPlugin.configure({
    inject: {
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img,
      ],
    },
    options: {
      offset: 24,
    },
  }),
];

export const AlignKit = [
  TextAlignPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: "start",
        nodeKey: "align",
        styleKey: "textAlign",
        validNodeValues: ["start", "left", "center", "right", "end", "justify"],
      },
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.img, KEYS.mediaEmbed],
    },
  }),
];

const fontOptions = {
  inject: { targetPlugins: [KEYS.p] },
} satisfies PlatePluginConfig;

export const FontKit = [
  FontColorPlugin.configure({
    inject: {
      ...fontOptions.inject,
      nodeProps: {
        defaultNodeValue: "black",
      },
    },
  }),
  FontBackgroundColorPlugin.configure(fontOptions),
  FontSizePlugin.configure(fontOptions),
  FontFamilyPlugin.configure(fontOptions),
];

export const LineHeightKit = [
  LineHeightPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: 1.5,
        validNodeValues: [1, 1.2, 1.5, 2, 3],
      },
      targetPlugins: [...KEYS.heading, KEYS.p],
    },
  }),
];

// ── Static/SSR plugins ───────────────────────────────────────────────

export const BaseIndentKit = [
  BaseIndentPlugin.configure({
    inject: {
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.codeBlock, KEYS.toggle],
    },
    options: {
      offset: 24,
    },
  }),
];

export const BaseAlignKit = [
  BaseTextAlignPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: "start",
        nodeKey: "align",
        styleKey: "textAlign",
        validNodeValues: ["start", "left", "center", "right", "end", "justify"],
      },
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.img, KEYS.mediaEmbed],
    },
  }),
];

const baseFontOptions = {
  inject: { targetPlugins: [KEYS.p] },
} satisfies SlatePluginConfig;

export const BaseFontKit = [
  BaseFontColorPlugin.configure(baseFontOptions),
  BaseFontBackgroundColorPlugin.configure(baseFontOptions),
  BaseFontSizePlugin.configure(baseFontOptions),
  BaseFontFamilyPlugin.configure(baseFontOptions),
];

export const BaseLineHeightKit = [
  BaseLineHeightPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: 1.5,
        validNodeValues: [1, 1.2, 1.5, 2, 3],
      },
      targetPlugins: [...KEYS.heading, KEYS.p],
    },
  }),
];
